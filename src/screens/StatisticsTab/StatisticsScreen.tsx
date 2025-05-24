// src/screens/StatisticsTab/StatisticsScreen.tsx
import React, { useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PieChart } from "react-native-gifted-charts";
import * as Clipboard from 'expo-clipboard';

import { BottomTabNavigatorParamList } from '../../navigation/types';
import { theme } from '../../theme'; //
import { EstronMonthPeriod } from '../../utils/dateUtils'; //
import {
  getToday,
  getEstronMonthPeriod,
  calculateStandardWorkdays,
  formatToYYYYMMDD,
} from '../../utils/dateUtils'; //
import {
  getQuotasFromStorage,
  getProductionEntriesByDateRangeFromStorage,
  getSupplementaryDataByDateRangeFromStorage,
} from '../../services/storage'; //
import Button from '../../components/common/Button'; //
import ModalWrapper from '../../components/common/ModalWrapper'; //

type StatisticsScreenNavigationProp = BottomTabNavigationProp<BottomTabNavigatorParamList, 'StatisticsTab'>;

const { width } = Dimensions.get('window');
const chartBlockSize = (width - theme.spacing.md * 3) / 2;
const smallBlockSize = (width - theme.spacing.md * 4) / 3;

const AUTHOR_NAME = "Nguyễn Quốc Dương";
const DONATE_INFO = {
  bank: "Ngân hàng Vietcombank",
  accountNumber: "0421000518940",
  accountHolder: "NGUYEN QUOC DUONG"
};

export default function StatisticsScreen() {
  const navigation = useNavigation<StatisticsScreenNavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [currentEstronMonth, setCurrentEstronMonth] = useState<EstronMonthPeriod | null>(null); //
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  const [standardWorkdaysForMonth, setStandardWorkdaysForMonth] = useState<number>(0);
  const [standardWorkdaysToCurrent, setStandardWorkdaysToCurrent] = useState<number>(0);

  const [totalProductWorkDone, setTotalProductWorkDone] = useState<number>(0);
  const [targetProductWork, setTargetProductWork] = useState<number>(0);

  const [totalOvertimeHours, setTotalOvertimeHours] = useState<number>(0);
  const [totalLeaveDays, setTotalLeaveDays] = useState<number>(0);
  const [totalMeetingHours, setTotalMeetingHours] = useState<number>(0);

  const [isAuthorModalVisible, setIsAuthorModalVisible] = useState(false);

  const handleShowAuthorModal = () => setIsAuthorModalVisible(true);
  const handleCloseAuthorModal = () => setIsAuthorModalVisible(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Đã sao chép", `${text} đã được sao chép vào bộ nhớ tạm.`);
  };


  useLayoutEffect(() => {
    navigation.setOptions({
      title: currentEstronMonth?.estronMonth
        ? `Thống kê tháng ${currentEstronMonth.estronMonth}`
        : 'Thống Kê Chung',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleShowAuthorModal}
          style={{
            marginRight : Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.md,
            padding: theme.spacing.xs,
          }}
        >
          <Ionicons name="information-circle-outline" size={26} color={theme.colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentEstronMonth, handleShowAuthorModal]);

  const loadStatisticsData = useCallback(async () => {
    setIsLoading(true);
    setErrorLoading(null);
    try {
      const today = getToday(); //
      const monthInfo = getEstronMonthPeriod(today); //
      setCurrentEstronMonth(monthInfo);

      if (monthInfo && monthInfo.startDate && monthInfo.endDate) {
        const startDateStr = formatToYYYYMMDD(monthInfo.startDate); //
        const endDateStr = formatToYYYYMMDD(monthInfo.endDate); //

        const workdaysForMonth = calculateStandardWorkdays(monthInfo.startDate, monthInfo.endDate); //
        setStandardWorkdaysForMonth(workdaysForMonth);

        const cappedToday = today > monthInfo.endDate ? monthInfo.endDate : today;
        const workdaysToCurrent = calculateStandardWorkdays(monthInfo.startDate, cappedToday); //
        setStandardWorkdaysToCurrent(workdaysToCurrent);

        const [quotas, productionEntries, supplementaryData] = await Promise.all([
          getQuotasFromStorage(), //
          getProductionEntriesByDateRangeFromStorage(startDateStr, endDateStr), //
          getSupplementaryDataByDateRangeFromStorage(startDateStr, endDateStr), //
        ]);

        let calculatedTotalProductWorkDone = 0;
        if (quotas.length > 0 && productionEntries.length > 0) {
          productionEntries.forEach(entry => {
            const quota = quotas.find(q => q.stageCode === entry.stageCode);
            if (quota && quota.dailyQuota > 0) {
              calculatedTotalProductWorkDone += entry.quantity / quota.dailyQuota;
            }
          });
        }
        setTotalProductWorkDone(parseFloat(calculatedTotalProductWorkDone.toFixed(2)));

        let currentTotalOvertime = 0;
        let currentTotalLeaveHours = 0;
        let currentTotalMeetingMinutes = 0;

        supplementaryData.forEach(item => {
          if (item.overtimeHours && item.overtimeHours > 0) {
            currentTotalOvertime += item.overtimeHours;
          }
          if (item.leaveHours && item.leaveHours > 0) {
            currentTotalLeaveHours += item.leaveHours;
          }
          if (item.meetingMinutes && item.meetingMinutes > 0) {
            currentTotalMeetingMinutes += item.meetingMinutes;
          }
        });

        const finalTotalOvertimeHours = parseFloat(currentTotalOvertime.toFixed(2));
        const finalTotalLeaveDays = parseFloat((currentTotalLeaveHours / 8).toFixed(2));
        const finalTotalMeetingHours = parseFloat((currentTotalMeetingMinutes / 60).toFixed(2));

        setTotalOvertimeHours(finalTotalOvertimeHours);
        setTotalLeaveDays(finalTotalLeaveDays);
        setTotalMeetingHours(finalTotalMeetingHours);

        const calculatedTargetProductWork = workdaysToCurrent + (finalTotalOvertimeHours / 8) - finalTotalLeaveDays - (finalTotalMeetingHours / 8);
        setTargetProductWork(parseFloat(Math.max(0, calculatedTargetProductWork).toFixed(2)));

      } else {
        setErrorLoading("Không thể xác định thông tin tháng Estron hiện tại.");
        setStandardWorkdaysForMonth(0);
        setStandardWorkdaysToCurrent(0);
        setTotalProductWorkDone(0);
        setTargetProductWork(0);
        setTotalOvertimeHours(0);
        setTotalLeaveDays(0);
        setTotalMeetingHours(0);
      }
    } catch (error) {
      console.error("Error loading statistics data:", error);
      setErrorLoading("Đã có lỗi xảy ra khi tải dữ liệu thống kê.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatisticsData();
    }, [loadStatisticsData])
  );

  const renderProgressChart = (
    value: number,
    maxValue: number,
    title: string,
    defaultColor: string,
    unit: string = "",
    isProductWorkChart: boolean = false
  ) => {
    const percentage = maxValue > 0 ? Math.min(100, Math.max(0, (value / maxValue) * 100)) : (value > 0 ? 100 : 0);
    const displayValue = value >= 0 ? value : 0;

    let ringColor = defaultColor;
    if (isProductWorkChart) {
      ringColor = value >= maxValue ? theme.colors.success : theme.colors.danger;
    }

    return (
      <View style={styles.chartBlock}>
        <PieChart
          donut
          radius={chartBlockSize / 2.8}
          innerRadius={chartBlockSize / 4}
          data={[{ value: percentage, color: ringColor, focused: true }, { value: 100 - percentage, color: theme.colors.lightGrey }]}
          centerLabelComponent={() => (
            <View style={styles.chartCenterLabel}>
              <Text style={styles.chartValueTextMain}>{`${displayValue.toLocaleString()}`}</Text>
              <Text style={styles.chartValueTextUnit}>{unit}</Text>
            </View>
          )}
        />
        <Text style={styles.chartTitleText}>{title}</Text>
        <Text style={styles.chartSubText}>{`Mục tiêu: ${maxValue.toLocaleString()}${unit}`}</Text>
      </View>
    );
  };

  const renderSmallInfoBlock = (
    iconName: React.ComponentProps<typeof Ionicons>['name'],
    value: number,
    label: string,
    unit: string,
    iconColor: string
  ) => {
    return (
      <View style={styles.smallBlock}>
        <Ionicons name={iconName} size={30} color={iconColor} style={styles.smallBlockIcon} />
        <Text style={styles.smallBlockValue}>{value.toLocaleString()} <Text style={styles.smallBlockUnit}>{unit}</Text></Text>
        <Text style={styles.smallBlockLabel}>{label}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu thống kê...</Text>
      </View>
    );
  }

  if (errorLoading) {
     return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={48} color={theme.colors.danger} />
        <Text style={styles.errorText}>{errorLoading}</Text>
        <Button title="Thử Lại" onPress={loadStatisticsData} style={{marginTop: theme.spacing.md}}/>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.rowContainer}>
        {renderProgressChart(standardWorkdaysToCurrent, standardWorkdaysForMonth, "Ngày công làm việc", theme.colors.success, "ngày")}
        {renderProgressChart(totalProductWorkDone, targetProductWork, "Công sản phẩm", theme.colors.info, "công", true)}
      </View>

      <View style={[styles.rowContainer, { marginTop: theme.spacing.md }]}>
        {renderSmallInfoBlock("time-outline", totalOvertimeHours, "Giờ tăng ca", "", theme.colors.success)}
        {renderSmallInfoBlock("walk-outline", totalLeaveDays, "Ngày nghỉ", "", theme.colors.danger)}
        {renderSmallInfoBlock("people-outline", totalMeetingHours, "Giờ họp/đào tạo", "", theme.colors.warning)}
      </View>

      <ModalWrapper //
        visible={isAuthorModalVisible}
        onClose={handleCloseAuthorModal}
        // title="Thông tin tác giả" // Bỏ title mặc định để custom
      >
        <View style={styles.authorModalContainer}>
          <View style={styles.authorModalHeader}>
             <Text style={styles.authorModalTitle}>Thông tin tác giả</Text>
             <TouchableOpacity onPress={handleCloseAuthorModal} style={styles.customCloseButton}>
                <Ionicons name="close-circle" size={28} color={theme.colors.secondary} />
             </TouchableOpacity>
          </View>

          <Text style={styles.authorText}>Ứng dụng được phát triển bởi:</Text>
          <Text style={styles.authorName}>{AUTHOR_NAME}</Text>

          <View style={styles.divider} />

          <Text style={styles.donateTitle}>Ủng hộ tác giả:</Text>
          <Text style={styles.donateText}>
            Nếu bạn thấy ứng dụng này hữu ích, bạn có thể ủng hộ một ly cafe cho tác giả qua:
          </Text>
          <View style={styles.donateInfoRow}>
            <Text style={styles.donateBank}>{DONATE_INFO.bank}</Text>
          </View>
           <View style={styles.donateInfoRow}>
            <Text style={styles.donateAccountLabel}>Chủ TK:</Text>
            <Text style={styles.donateAccountValue}>{DONATE_INFO.accountHolder}</Text>
          </View>
          <View style={styles.donateInfoRow}>
            <Text style={styles.donateAccountLabel}>Số TK:</Text>
            <Text style={styles.donateAccountValue}>{DONATE_INFO.accountNumber}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(DONATE_INFO.accountNumber)} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>


          <Button title="Đóng" onPress={handleCloseAuthorModal} style={styles.closeModalButton} />
        </View>
      </ModalWrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  chartBlock: {
    width: chartBlockSize,
    height: chartBlockSize * 1.1,
    backgroundColor: theme.colors.cardBackground, //
    borderRadius: theme.borderRadius.lg, //
    padding: theme.spacing.sm, //
    alignItems: 'center',
    justifyContent: 'space-around',
    ...theme.shadow.md,
  },
  chartCenterLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartValueTextMain: {
    fontSize: chartBlockSize / 5.5,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chartValueTextUnit: {
    fontSize: chartBlockSize / 10,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.xs,
  },
  chartTitleText: {
    fontSize: theme.typography.bodySmall.fontSize, //
    fontWeight: '600',
    color: theme.colors.text, //
    textAlign: 'center',
    marginTop: theme.spacing.xs, //
  },
  chartSubText: {
    fontSize: theme.typography.caption.fontSize, //
    color: theme.colors.textSecondary, //
    textAlign: 'center',
  },
  smallBlock: {
    width: smallBlockSize,
    height: smallBlockSize * 1.1,
    backgroundColor: theme.colors.cardBackground, //
    borderRadius: theme.borderRadius.lg, //
    padding: theme.spacing.sm, //
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  smallBlockIcon: {
    marginBottom: theme.spacing.xs, //
  },
  smallBlockValue: {
    fontSize: smallBlockSize / 5,
    fontWeight: 'bold',
    color: theme.colors.text, //
    textAlign: 'center',
  },
  smallBlockUnit: {
    fontSize: theme.typography.caption.fontSize, //
    fontWeight: 'normal',
    color: theme.colors.textSecondary, //
  },
  smallBlockLabel: {
    fontSize: theme.typography.caption.fontSize, //
    color: theme.colors.textSecondary, //
    textAlign: 'center',
    marginTop: theme.spacing.xs, //
  },
  // Author Modal Styles
  authorModalContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm, //
  },
  authorModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center', // Center title
    alignItems: 'center',
    marginBottom: theme.spacing.lg, //
    paddingBottom: theme.spacing.md, //
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor, //
    position: 'relative', // For absolute positioning of close button
  },
  authorModalTitle: {
    fontSize: theme.typography.h3.fontSize, //
    fontWeight: theme.typography.h3.fontWeight, //
    color: theme.colors.text, //
  },
  customCloseButton: {
    position: 'absolute',
    right: -theme.spacing.sm, // Adjust to align properly if ModalWrapper has padding
    top: -theme.spacing.sm, // Adjust
    padding: theme.spacing.xs, //
  },
  authorText: {
    fontSize: theme.typography.body.fontSize, //
    color: theme.colors.textSecondary, //
    marginBottom: theme.spacing.xs, //
  },
  authorName: {
    fontSize: theme.typography.h4.fontSize, //
    fontWeight: theme.typography.h4.fontWeight, //
    color: theme.colors.primary, //
    marginBottom: theme.spacing.md, //
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor, //
    width: '80%',
    marginVertical: theme.spacing.md, //
  },
  donateTitle: {
    fontSize: theme.typography.h4.fontSize, //
    fontWeight: '600',
    color: theme.colors.text, //
    marginBottom: theme.spacing.sm, //
  },
  donateText: {
    fontSize: theme.typography.bodySmall.fontSize, //
    color: theme.colors.textSecondary, //
    textAlign: 'center',
    marginBottom: theme.spacing.sm, //
    paddingHorizontal: theme.spacing.sm, //
  },
  donateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xs, //
  },
  donateBank: {
    fontSize: theme.typography.body.fontSize, //
    fontWeight: 'bold',
    color: theme.colors.success, //
    marginBottom: theme.spacing.xs, //
  },
  donateAccountLabel: {
    fontSize: theme.typography.bodySmall.fontSize, //
    color: theme.colors.textSecondary, //
    marginRight: theme.spacing.xs, //
  },
  donateAccountValue: {
    fontSize: theme.typography.body.fontSize, //
    color: theme.colors.text, //
    fontWeight: '500',
  },
  copyButton: {
    marginLeft: theme.spacing.md, //
    padding: theme.spacing.xs, //
  },
  closeModalButton: {
    marginTop: theme.spacing.lg, //
    width: '60%',
  }
});