// screens/InputTab/SettingScreen.tsx
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';

import { InputStackNavigatorParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { Quota } from '../../types/data';
import {
  getQuotasFromStorage,
  addQuotaToStorage,
  deleteQuotaFromStorage,
  saveQuotasToStorage,
  updateQuotaInStorage,
} from '../../services/storage';

// Custom components (nếu bạn đã tạo)
import Button from '../../components/common/Button'; // Đường dẫn tới Button của bạn
import TextInput from '../../components/common/TextInput'; // Đường dẫn tới TextInput của bạn
import ModalWrapper from '../../components/common/ModalWrapper'; // Đường dẫn tới ModalWrapper của bạn
// import Card from '@/components/common/Card'; // Nếu dùng Card để bao bọc item

type SettingScreenNavigationProp = StackNavigationProp<InputStackNavigatorParamList, 'Settings'>;

interface QuotaFormData {
  id?: string;
  stageCode: string;
  dailyQuota: string; // Input sẽ là string, cần chuyển đổi
}

export default function SettingScreen() {
  const navigation = useNavigation<SettingScreenNavigationProp>();
  const isFocused = useIsFocused();

  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentQuota, setCurrentQuota] = useState<QuotaFormData | null>(null);
  const [errors, setErrors] = useState<{ stageCode?: string; dailyQuota?: string }>({});

  const loadQuotas = useCallback(async () => {
    setIsLoading(true);
    const storedQuotas = await getQuotasFromStorage();
    setQuotas(storedQuotas);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadQuotas();
      // Reset edit mode khi màn hình được focus lại (trừ khi đang mở modal)
      if (!isModalVisible) {
        setIsEditMode(false);
      }
    }
  }, [isFocused, loadQuotas, isModalVisible]);

  // Cập nhật nút trên Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (isEditMode) {
              // Lưu trạng thái sắp xếp và thoát chế độ Edit
              handleSaveChangesInEditMode();
            } else {
              setIsEditMode(true);
            }
          }}
          style={{ marginRight: theme.spacing.md }}
        >
          <Text style={{ color: theme.colors.white, fontSize: 16 }}>
            {isEditMode ? 'Lưu Sắp Xếp' : 'Sửa'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditMode, quotas]); // Thêm quotas vào dependency để cập nhật khi có thay đổi

  const handleOpenModal = (quotaToEdit?: Quota) => {
    if (quotaToEdit) {
      setCurrentQuota({
        id: quotaToEdit.id,
        stageCode: quotaToEdit.stageCode,
        dailyQuota: quotaToEdit.dailyQuota.toString(),
      });
    } else {
      setCurrentQuota({ stageCode: '', dailyQuota: '' });
    }
    setErrors({});
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setCurrentQuota(null);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { stageCode?: string; dailyQuota?: string } = {};
    if (!currentQuota?.stageCode.trim()) {
      newErrors.stageCode = 'Mã công đoạn không được để trống.';
    }
    const quotaNum = parseFloat(currentQuota?.dailyQuota || '');
    if (isNaN(quotaNum) || quotaNum <= 0) {
      newErrors.dailyQuota = 'Định mức ngày phải là một số dương.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveQuota = async () => {
    if (!currentQuota || !validateForm()) {
      return;
    }

    setIsLoading(true);
    const { id, stageCode, dailyQuota } = currentQuota;
    const quotaValue = parseFloat(dailyQuota);

    let success = false;
    if (id) { // Cập nhật định mức hiện có
      const updated = await updateQuotaInStorage({ id, stageCode, dailyQuota: quotaValue, order: quotas.find(q=>q.id === id)?.order ?? 0 });
      if (updated) success = true;
      else Alert.alert("Lỗi", "Cập nhật định mức thất bại. Mã công đoạn có thể đã tồn tại.");
    } else { // Thêm định mức mới
      const added = await addQuotaToStorage({ stageCode, dailyQuota: quotaValue });
      if (added) success = true;
      else Alert.alert("Lỗi", "Thêm định mức thất bại. Mã công đoạn có thể đã tồn tại.");
    }

    if (success) {
      await loadQuotas();
      handleCloseModal();
    }
    setIsLoading(false);
  };

  const handleDeleteQuota = (quotaId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa định mức này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await deleteQuotaFromStorage(quotaId);
            // Cập nhật lại state quotas mà không cần gọi API nếu chỉ xóa
            setQuotas(prevQuotas => prevQuotas.filter(q => q.id !== quotaId).map((q, index) => ({ ...q, order: index })));
            // await loadQuotas(); // Hoặc gọi lại loadQuotas để chắc chắn
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const handleSaveChangesInEditMode = async () => {
    setIsLoading(true);
    await saveQuotasToStorage(quotas); // Lưu lại toàn bộ danh sách quotas với thứ tự mới
    setIsEditMode(false);
    setIsLoading(false);
    Alert.alert("Đã lưu", "Thứ tự định mức đã được cập nhật.");
  };


const renderQuotaItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Quota>): React.ReactNode => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={isEditMode ? drag : undefined} // Chỉ cho phép kéo khi ở edit mode
          disabled={isActive}
          style={[
            styles.itemContainer,
            isActive && styles.itemActive,
            // Platform.OS === 'web' && isEditMode && { cursor: 'grab' } // Thêm cursor cho web
          ]}
          onPress={() => {
            if (!isEditMode) { // Mở modal để sửa khi không ở edit mode
                handleOpenModal(item);
            }
          }}
        >
          {isEditMode && (
            <TouchableOpacity onPress={() => handleDeleteQuota(item.id)} style={styles.deleteButton}>
              <Ionicons name="remove-circle" size={24} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemStageCode}>{item.stageCode}</Text>
            <Text style={styles.itemDailyQuota}>Định mức: {item.dailyQuota}</Text>
          </View>
          {isEditMode ? (
            <TouchableOpacity onPressIn={drag} disabled={isActive} style={styles.dragHandle}>
                 <Ionicons name="reorder-three-outline" size={28} color={theme.colors.grey} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.grey} />
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };


  if (isLoading && !isModalVisible) { // Chỉ hiển thị loading toàn màn hình khi không có modal
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {quotas.length === 0 && !isLoading ? (
        <View style={styles.centered}>
            <Text style={styles.emptyText}>Chưa có định mức nào.</Text>
            <Text style={styles.emptyText}>Nhấn "Thêm định mức" để bắt đầu.</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={quotas}
          renderItem={renderQuotaItem}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data: reorderedData }) => {
            // Cập nhật state với thứ tự mới, `order` sẽ được cập nhật khi lưu
            setQuotas(reorderedData);
          }}
          containerStyle={{ flex: 1 }}
          ListHeaderComponent={<View style={{height: theme.spacing.sm}} />} // Khoảng trống ở đầu list
          ListFooterComponent={<View style={{height: theme.spacing.md}}/>} // Khoảng trống ở cuối list
        />
      )}

      {!isEditMode && ( // Chỉ hiển thị nút "Thêm định mức" khi không ở chế độ sửa
        <Button
          title="Thêm Định Mức Mới"
          onPress={() => handleOpenModal()}
          style={styles.addButton}
        />
      )}

      <ModalWrapper
        visible={isModalVisible}
        onClose={handleCloseModal}
        // Bỏ prop `title` ở đây để không hiển thị header mặc định của ModalWrapper
        // title={currentQuota?.id ? 'Sửa Định Mức' : 'Thêm Định Mức Mới'}
      >
        {/* Thêm header tùy chỉnh vào đây */}
        <View style={styles.customModalHeaderContainer}>
          <Text style={styles.customModalHeaderText}>
            {currentQuota?.id ? 'Sửa Định Mức' : 'Thêm Định Mức Mới'}
          </Text>
        </View>

        {/* Phần nội dung còn lại của Modal không thay đổi */}
        <View style={styles.modalInnerContent}> {/* Đổi tên style để tránh trùng với style cũ nếu có */}
          <TextInput
            label="Mã công đoạn"
            value={currentQuota?.stageCode || ''}
            onChangeText={(text) => setCurrentQuota(prev => prev ? { ...prev, stageCode: text.toUpperCase() } : { stageCode: text.toUpperCase(), dailyQuota: '' })}
            placeholder="Ví dụ: 5.2" // Cập nhật placeholder
            error={errors.stageCode}
            touched={!!errors.stageCode}
            autoCapitalize="characters"
          />
          <TextInput
            label="Định mức ngày"
            value={currentQuota?.dailyQuota || ''}
            onChangeText={(text) => setCurrentQuota(prev => prev ? { ...prev, dailyQuota: text.replace(/[^0-9.]/g, '') } : { stageCode: '', dailyQuota: text.replace(/[^0-9.]/g, '') })}
            placeholder="Ví dụ: 1135" // Cập nhật placeholder
            keyboardType="numeric"
            error={errors.dailyQuota}
            touched={!!errors.dailyQuota}
          />
          <View style={styles.modalActions}>
            <Button title="Hủy" onPress={handleCloseModal} type="secondary" style={styles.modalButton} />
            <Button title={isLoading ? "Đang lưu..." : "Lưu"} onPress={handleSaveQuota} type="primary" style={styles.modalButton} disabled={isLoading} />
          </View>
        </View>
      </ModalWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGrey, // Nền hơi xám nhẹ
  },
  customModalHeaderContainer: {
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    alignItems: 'center', // Căn giữa tiêu đề
  },
  customModalHeaderText: {
    fontSize: theme.typography.h3.fontSize, // Kích thước lớn, đậm
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
  },
  modalInnerContent: { // Style cho phần nội dung chính bên trong modal (Inputs, Buttons)
    // Bạn có thể thêm padding ở đây nếu cần,
    // hoặc nếu ModalWrapper đã có padding cho children thì không cần.
    // Ví dụ: paddingHorizontal: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  itemContainer: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow.sm,
  },
  itemActive: {
    ...theme.shadow.lg, // Nổi bật hơn khi đang kéo
    backgroundColor: theme.colors.light,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemStageCode: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight,
    color: theme.colors.text,
  },
  itemDailyQuota: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  deleteButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  dragHandle: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  addButton: {
    margin: theme.spacing.md,
  },
  // Modal styles
  modalContent: {
    paddingVertical: theme.spacing.md, // Không cần padding ngang vì ModalWrapper đã có
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Hoặc 'flex-end' nếu muốn các nút về 1 phía
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1, // Cho các nút có chiều rộng bằng nhau
    marginHorizontal: theme.spacing.sm, // Khoảng cách giữa các nút
  },
});