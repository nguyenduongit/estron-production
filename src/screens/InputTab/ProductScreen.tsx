// src/screens/InputTab/ProductScreen.tsx
import React, { useState, useEffect, useCallback, useLayoutEffect, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { InputStackNavigatorParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { Quota, ProductionEntry, DailyProductionData } from '../../types/data';
import {
  getQuotasFromStorage,
  getProductionEntriesByDateRangeFromStorage,
  deleteProductionEntryFromStorage,
} from '../../services/storage';
import {
  getToday,
  getCurrentEstronWeekInfo,
  EstronWeekPeriod,
  formatDate,
  formatToYYYYMMDD,
  getDayOfWeekVietnamese,
} from '../../utils/dateUtils';

import DailyProductionCard, { EntryInfoForDelete } from './DailyProductionCard';
import Button from '../../components/common/Button';
import ModalWrapper from '../../components/common/ModalWrapper';

// Dynamic import cho PagerView
const PagerView = Platform.OS !== 'web' ? lazy(() => import('react-native-pager-view')) : null;

type ProductScreenNavigationProp = StackNavigationProp<InputStackNavigatorParamList, 'ProductList'>;

interface ProcessedWeekData {
  weekInfo: EstronWeekPeriod;
  dailyData: DailyProductionData[];
  totalWeeklyWork: number;
}

interface EntryToDeleteModalInfo extends EntryInfoForDelete {
  formattedDate: string;
}

export default function ProductScreen() {
  const navigation = useNavigation<ProductScreenNavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [estronWeekInfo, setEstronWeekInfo] = useState<ReturnType<typeof getCurrentEstronWeekInfo> | null>(null);
  const [processedWeeksData, setProcessedWeeksData] = useState<ProcessedWeekData[]>([]);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDateForInput, setSelectedDateForInput] = useState<string>(formatToYYYYMMDD(getToday()));
  const [isDeleteConfirmModalVisible, setIsDeleteConfirmModalVisible] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<EntryToDeleteModalInfo | null>(null);

  useLayoutEffect(() => {
    if (estronWeekInfo && estronWeekInfo.estronMonth && estronWeekInfo.estronMonth.estronMonth) {
      navigation.setOptions({
        title: `Sản lượng tháng ${estronWeekInfo.estronMonth.estronMonth}`,
      });
    } else {
      navigation.setOptions({
        title: 'Sản Lượng Estron',
      });
    }
  }, [navigation, estronWeekInfo]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayForFilter = getToday();
      const currentEstronInfo = getCurrentEstronWeekInfo(todayForFilter);
      setEstronWeekInfo(currentEstronInfo);

      const [storedQuotas, allProductionEntries] = await Promise.all([
        getQuotasFromStorage(),
        currentEstronInfo.estronMonth.startDate && currentEstronInfo.estronMonth.endDate
          ? getProductionEntriesByDateRangeFromStorage(
              formatToYYYYMMDD(currentEstronInfo.estronMonth.startDate),
              formatToYYYYMMDD(currentEstronInfo.estronMonth.endDate)
            )
          : Promise.resolve([]),
      ]);
      setQuotas(storedQuotas);

      if (currentEstronInfo.visibleWeeks && currentEstronInfo.visibleWeeks.length > 0) {
        const weeksData: ProcessedWeekData[] = currentEstronInfo.visibleWeeks.map(week => {
          let totalWeeklyWorkAcc = 0;

          const daysInWeekToShow = week.days.filter(dayInWeek => {
            const dayStart = new Date(dayInWeek);
            dayStart.setHours(0, 0, 0, 0);
            const todayStart = new Date(todayForFilter);
            todayStart.setHours(0, 0, 0, 0);
            return dayStart <= todayStart;
          });

          const dailyDataForWeek: DailyProductionData[] = daysInWeekToShow.map(dayDate => {
            const yyyymmdd = formatToYYYYMMDD(dayDate);
            const entriesForDay = allProductionEntries.filter(entry => entry.date === yyyymmdd);
            let totalDailyWork = 0;

            const dailyEntries = entriesForDay.map(entry => {
              const quota = storedQuotas.find(q => q.stageCode === entry.stageCode);
              const workAmount = quota && quota.dailyQuota > 0 ? entry.quantity / quota.dailyQuota : 0;
              totalDailyWork += workAmount;
              return {
                id: entry.id,
                stageCode: entry.stageCode,
                quantity: entry.quantity,
                workAmount: parseFloat(workAmount.toFixed(2)),
              };
            });
            totalWeeklyWorkAcc += totalDailyWork;

            return {
              date: yyyymmdd,
              dayOfWeek: getDayOfWeekVietnamese(dayDate),
              formattedDate: formatDate(dayDate, 'dd/MM'),
              entries: dailyEntries,
              totalWorkForDay: parseFloat(totalDailyWork.toFixed(2)),
            };
          });
          return {
            weekInfo: week,
            dailyData: dailyDataForWeek,
            totalWeeklyWork: parseFloat(totalWeeklyWorkAcc.toFixed(2)),
          };
        });
        setProcessedWeeksData(weeksData);

        const todayWeekIndex = currentEstronInfo.visibleWeeks.findIndex(
          week => todayForFilter >= week.startDate && todayForFilter <= week.endDate
        );
        if (todayWeekIndex !== -1) {
          setCurrentPage(todayWeekIndex);
        } else if (currentEstronInfo.visibleWeeks.length > 0) {
          setCurrentPage(currentEstronInfo.visibleWeeks.length - 1);
        }
      } else {
        setProcessedWeeksData([]);
      }
    } catch (error) {
      console.error("Error loading product screen data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu màn hình sản phẩm.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  const handleShowDeleteConfirmModal = (entryInfo: EntryInfoForDelete, entryFormattedDate: string) => {
    setEntryToDelete({ ...entryInfo, formattedDate: entryFormattedDate });
    setIsDeleteConfirmModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      const success = await deleteProductionEntryFromStorage(entryToDelete.id);
      if (success) {
        Alert.alert('Thành công', 'Đã xóa mục sản lượng.');
        await loadInitialData();
      } else {
        Alert.alert('Lỗi', 'Không thể xóa mục sản lượng. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error("Error deleting production entry:", error);
      Alert.alert('Lỗi nghiêm trọng', 'Đã có lỗi xảy ra khi xóa.');
    } finally {
      setIsDeleteConfirmModalVisible(false);
      setEntryToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmModalVisible(false);
    setEntryToDelete(null);
  };

  const handleSelectProduct = (quota: Quota) => {
    setIsProductModalVisible(false);
    navigation.navigate('InputDetails', {
      stageCode: quota.stageCode,
      quotaValue: quota.dailyQuota,
      date: selectedDateForInput,
    });
  };

  const openProductModal = (dateForInput: string) => {
    if (quotas.length === 0) {
      Alert.alert("Chưa có định mức", "Vui lòng vào Cài đặt để thêm định mức sản phẩm trước.");
      return;
    }
    setSelectedDateForInput(dateForInput);
    setIsProductModalVisible(true);
  };

  const renderWeekPage = (weekData: ProcessedWeekData) => {
    const weekHasData = quotas.length > 0;
    return (
      <View key={weekData.weekInfo.name} style={styles.pageStyle}>
        <View style={styles.weekHeader}>
          <View>
            <Text style={styles.weekName}>{weekData.weekInfo.name}</Text>
            <Text style={styles.weekDateRange}>
              ({formatDate(weekData.weekInfo.startDate, 'dd/MM')} - {formatDate(weekData.weekInfo.endDate, 'dd/MM')})
            </Text>
          </View>
          {weekHasData && (
            <Text style={styles.totalWeeklyWorkText}>
              Tổng công tuần: {weekData.totalWeeklyWork != null ? weekData.totalWeeklyWork.toLocaleString() : '0'}
            </Text>
          )}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.sm }}>
          {weekData.dailyData.map(day => (
            <DailyProductionCard
              key={day.date}
              dailyInfo={day}
              weekHasData={weekHasData}
              onAddProduction={openProductModal}
              onAttemptDeleteEntry={(entryInfo) => handleShowDeleteConfirmModal(entryInfo, day.formattedDate)}
            />
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!estronWeekInfo || processedWeeksData.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Không có dữ liệu tuần để hiển thị.</Text>
        <Button title="Thử Tải Lại" onPress={loadInitialData} style={{ marginTop: theme.spacing.md }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <Swiper
          style={styles.pagerView}
          initialSlide={currentPage}
          onSlideChange={(swiper) => setCurrentPage(swiper.activeIndex)}
        >
          {processedWeeksData.map(weekData => (
            <SwiperSlide key={weekData.weekInfo.name}>
              {renderWeekPage(weekData)}
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        PagerView && (
          <PagerView
            style={styles.pagerView}
            initialPage={currentPage}
            key={processedWeeksData.length + "-" + currentPage}
            onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
          >
            {processedWeeksData.map(weekData => renderWeekPage(weekData))}
          </PagerView>
        )
      )}

      <ModalWrapper
        visible={isProductModalVisible}
        onClose={() => setIsProductModalVisible(false)}
      >
        <View style={styles.customModalHeader}>
          <Text style={styles.customModalTitle}>Chọn sản phẩm</Text>
          <Text style={styles.customModalSubtitle}>
            {selectedDateForInput ? formatDate(selectedDateForInput, 'PPPP') : ''}
          </Text>
        </View>
        {quotas.length > 0 ? (
          <FlatList
            data={quotas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productModalItemGrid}
                onPress={() => handleSelectProduct(item)}
              >
                <Text style={styles.productStageCodeGrid}>{item.stageCode}</Text>
                <Text style={styles.productDailyQuotaGrid}>Định mức: {item.dailyQuota.toLocaleString()}</Text>
              </TouchableOpacity>
            )}
            style={styles.productListGrid}
          />
        ) : (
          <Text style={styles.emptyTextModal}>Không có định mức nào được cài đặt.</Text>
        )}
      </ModalWrapper>

      {entryToDelete && (
        <ModalWrapper
          visible={isDeleteConfirmModalVisible}
          onClose={handleCancelDelete}
        >
          <View style={styles.confirmDeleteModalContainer}>
            <Text style={styles.confirmDeleteTitle}>Xác nhận xóa</Text>
            <Text style={styles.confirmDeleteMessage}>
              Bạn có chắc chắn muốn xóa mục sản lượng này?
            </Text>
            <View style={styles.confirmDeleteDetails}>
              <Text style={styles.detailText}>{`Công đoạn: ${entryToDelete.stageCode}`}</Text>
              <Text style={styles.detailText}>{`Số lượng: ${entryToDelete.quantity.toLocaleString()}`}</Text>
              <Text style={styles.detailText}>{`Ngày: ${entryToDelete.formattedDate}`}</Text>
            </View>
            <View style={styles.confirmDeleteActions}>
              <Button title="Hủy" onPress={handleCancelDelete} type="secondary" style={styles.modalButton} />
              <Button title="Xóa" onPress={handleConfirmDelete} type="danger" style={styles.modalButton} />
            </View>
          </View>
        </ModalWrapper>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  pagerView: {
    flex: 1,
    width: '100%',
    overflow:'scroll'
  },
  pageStyle: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
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
  weekHeader: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    marginHorizontal: -theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGrey,
  },
  weekName: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.primary,
  },
  weekDateRange: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  totalWeeklyWorkText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  customModalHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  customModalTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  customModalSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  productListGrid: {
    maxHeight: 400,
  },
  productModalItemGrid: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minHeight: 100,
  },
  productStageCodeGrid: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  productDailyQuotaGrid: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyTextModal: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  confirmDeleteModalContainer: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  confirmDeleteTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  confirmDeleteMessage: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  confirmDeleteDetails: {
    marginVertical: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGrey,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'stretch',
  },
  detailText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  confirmDeleteActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
});