// screens/InputTab/InputScreen.tsx
import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; // Import date picker
import Ionicons from '@expo/vector-icons/Ionicons';

import { InputStackNavigatorParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { addOrUpdateProductionEntryInStorage, getProductionEntriesByDateFromStorage } from '../../services/storage';
import { formatToYYYYMMDD, formatDate } from '../../utils/dateUtils'; 
import { parseISO } from 'date-fns'; 
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';

type InputScreenRouteProp = RouteProp<InputStackNavigatorParamList, 'InputDetails'>;
type InputScreenNavigationProp = StackNavigationProp<InputStackNavigatorParamList, 'InputDetails'>;

interface Props {
  route: InputScreenRouteProp;
  navigation: InputScreenNavigationProp;
}

export default function InputScreen({ route, navigation }: Props) {
  const { stageCode, quotaValue, date: initialDateString } = route.params;

  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDateString ? parseISO(initialDateString) : new Date() // Nếu có initialDateString, chuyển nó thành Date
  );
  const [quantity, setQuantity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Đặt title cho header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Nhập SL cho ${stageCode}`,
    });
  }, [navigation, stageCode]);

  // Load số lượng đã nhập trước đó cho ngày và mã công đoạn này (nếu có)
  useEffect(() => {
    const fetchExistingEntry = async () => {
        setIsLoading(true);
        try {
            const dateStr = formatToYYYYMMDD(selectedDate);
            const entriesForDay = await getProductionEntriesByDateFromStorage(dateStr);
            const existingEntry = entriesForDay.find(e => e.stageCode === stageCode);
            if (existingEntry) {
                setQuantity(existingEntry.quantity.toString());
            } else {
                setQuantity(''); // Reset nếu không có hoặc đổi ngày
            }
        } catch (error) {
            console.error("Error fetching existing entry:", error);
            setQuantity('');
        } finally {
            setIsLoading(false);
        }
    };
    fetchExistingEntry();
  }, [selectedDate, stageCode]);


  const onChangeDate = (event: DateTimePickerEvent, newSelectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Trên Android, picker tự ẩn
    if (newSelectedDate) {
      setSelectedDate(newSelectedDate);
      setFormError(null); // Reset lỗi khi thay đổi ngày
      // Không cần gọi fetchExistingEntry ở đây nữa vì useEffect trên selectedDate sẽ làm điều đó
    }
  };

  const validateInput = (): boolean => {
    if (!quantity.trim()) {
      setFormError('Số lượng không được để trống.');
      return false;
    }
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) { // Cho phép nhập 0 để có thể xóa/reset
      setFormError('Số lượng phải là một số không âm.');
      return false;
    }
    // (Tùy chọn) Cảnh báo nếu vượt định mức quá nhiều
    // if (quotaValue > 0 && numQuantity > quotaValue * 2) { // Ví dụ: cảnh báo nếu gấp đôi định mức
    //   Alert.alert("Cảnh báo", `Số lượng (${numQuantity}) nhập vào cao hơn nhiều so với định mức ngày (${quotaValue}). Bạn có chắc chắn?`);
    // }
    setFormError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateInput()) {
      return;
    }
    setIsLoading(true);
    const formattedDate = formatToYYYYMMDD(selectedDate);
    const numQuantity = parseFloat(quantity);

    try {
      const result = await addOrUpdateProductionEntryInStorage({
        date: formattedDate,
        stageCode: stageCode,
        quantity: numQuantity,
      });

      if (result) {
        Alert.alert('Thành công', 'Đã lưu sản lượng.');
        navigation.goBack();
      } else {
        Alert.alert('Lỗi', 'Không thể lưu sản lượng. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert('Lỗi nghiêm trọng', 'Đã có lỗi xảy ra khi lưu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>


      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={styles.icon} />
        <Text style={styles.datePickerText}>Ngày nhập: {formatDate(selectedDate, 'dd/MM/yyyy')}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedDate}
          mode="date"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()} // Không cho phép chọn ngày tương lai
        />
      )}

      <TextInput
        label="Số lượng sản xuất"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Nhập số lượng"
        keyboardType="numeric"
        style={styles.input}
        error={(formError && quantity.trim() ? undefined : formError) || undefined}
        touched={!!formError}
      />
       {formError && <Text style={styles.errorText}>{formError}</Text>}


      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Thoát" onPress={() => navigation.goBack()} type="secondary" style={styles.button} />
          <Button title="Lưu Sản Lượng" onPress={handleSave} type="primary" style={styles.button} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
 
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    marginBottom: theme.spacing.lg,
  },
  datePickerText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    marginTop: theme.spacing.sm, // Điều chỉnh khoảng cách nếu TextInput có label bên trong
  },
  errorText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1, // Để các nút có chiều rộng gần bằng nhau
    marginHorizontal: theme.spacing.sm,
  },
  loader: {
    marginTop: theme.spacing.xl,
  }
});