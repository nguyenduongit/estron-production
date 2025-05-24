// src/screens/InputTab/DailyProductionCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput as RNTextInput, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { theme } from '../../theme'; //
import { DailyProductionData, DailySupplementaryData } from '../../types/data'; //
import Card from '../../components/common/Card'; //
import {
  addOrUpdateDailySupplementaryData,
  getSupplementaryDataByDateFromStorage
} from '../../services/storage'; //

// Interface cho thông tin entry sẽ được truyền lên ProductScreen
export interface EntryInfoForDelete {
  id: string;
  stageCode: string;
  quantity: number;
}

interface DailyProductionCardProps {
  dailyInfo: DailyProductionData; //
  weekHasData: boolean;
  onAddProduction: (date: string) => void;
  onAttemptDeleteEntry?: (entryInfo: EntryInfoForDelete) => void;
}

const HOUR_OPTIONS = [1, 2, 3, 4, 8];

const DailyProductionCard: React.FC<DailyProductionCardProps> = ({
  dailyInfo,
  weekHasData,
  onAddProduction,
  onAttemptDeleteEntry,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingSupp, setIsLoadingSupp] = useState(false);

  const [currentLeaveHours, setCurrentLeaveHours] = useState<number | null | undefined>(undefined);
  const [currentOvertimeHours, setCurrentOvertimeHours] = useState<number | null | undefined>(undefined);
  const [currentMeetingMinutes, setCurrentMeetingMinutes] = useState<string>('');

  const isFullDayLeave = currentLeaveHours === 8;

  useEffect(() => {
    const loadSuppData = async () => {
      if (!dailyInfo.date) return;
      setIsLoadingSupp(true);
      try {
        const suppData = await getSupplementaryDataByDateFromStorage(dailyInfo.date); //
        if (suppData) {
          setCurrentLeaveHours(suppData.leaveHours);
          setCurrentOvertimeHours(suppData.overtimeHours);
          setCurrentMeetingMinutes(suppData.meetingMinutes?.toString() || '');
        } else {
          setCurrentLeaveHours(undefined);
          setCurrentOvertimeHours(undefined);
          setCurrentMeetingMinutes('');
        }
      } catch (error) {
        console.error("Error loading supplementary data for card:", error);
      } finally {
        setIsLoadingSupp(false);
      }
    };
    loadSuppData();
  }, [dailyInfo.date]);

  const handleSaveSupplementaryData = useCallback(async (
    field: keyof Omit<DailySupplementaryData, 'date'>,
    value: number | string | null,
    options?: { resetOvertimeAndMeeting?: boolean, resetLeave?: boolean }
  ) => {
    const dataToSave: DailySupplementaryData = { date: dailyInfo.date }; //

    dataToSave.leaveHours = field === 'leaveHours'
        ? (value as number | null)
        : (options?.resetLeave ? null : (currentLeaveHours === undefined ? null : currentLeaveHours));

    dataToSave.overtimeHours = field === 'overtimeHours'
        ? (value as number | null)
        : (options?.resetOvertimeAndMeeting ? null : (currentOvertimeHours === undefined ? null : currentOvertimeHours));

    dataToSave.meetingMinutes = field === 'meetingMinutes'
        ? (value === '' || value === null ? null : Number(value))
        : (options?.resetOvertimeAndMeeting ? null : (currentMeetingMinutes === '' ? null : Number(currentMeetingMinutes)));


    // Đảm bảo các giá trị undefined được chuyển thành null trước khi lưu
    if (dataToSave.leaveHours === undefined) dataToSave.leaveHours = null;
    if (dataToSave.overtimeHours === undefined) dataToSave.overtimeHours = null;
    if (dataToSave.meetingMinutes === undefined || isNaN(dataToSave.meetingMinutes as number)) dataToSave.meetingMinutes = null;

    try {
      await addOrUpdateDailySupplementaryData(dataToSave); //
    } catch (error) {
      console.error(`Error saving ${field} for ${dailyInfo.date}:`, error);
      Alert.alert("Lỗi", `Không thể lưu dữ liệu ${field}.`);
    }
  }, [dailyInfo.date, currentLeaveHours, currentOvertimeHours, currentMeetingMinutes]);

  const handleHourOptionPress = (type: 'leaveHours' | 'overtimeHours', hours: number) => {
    if (type === 'leaveHours') {
      const newValue = currentLeaveHours === hours ? null : hours;
      setCurrentLeaveHours(newValue);
      if (newValue === 8) { // Nếu chọn nghỉ 8 tiếng
        setCurrentOvertimeHours(null);
        setCurrentMeetingMinutes('');
        handleSaveSupplementaryData('leaveHours', newValue, { resetOvertimeAndMeeting: true });
      } else {
        handleSaveSupplementaryData('leaveHours', newValue);
      }
    } else if (type === 'overtimeHours') {
      if (isFullDayLeave) return; // Không cho phép chọn tăng ca nếu đang nghỉ cả ngày
      const newValue = currentOvertimeHours === hours ? null : hours;
      setCurrentOvertimeHours(newValue);
      handleSaveSupplementaryData('overtimeHours', newValue);
    }
  };

  const handleMeetingMinutesChange = (text: string) => {
    if (isFullDayLeave) return; // Không cho phép nhập nếu đang nghỉ cả ngày
    const newMinutes = text.replace(/[^0-9]/g, '');
    setCurrentMeetingMinutes(newMinutes);
  };

  const handleMeetingMinutesBlur = () => {
    if (isFullDayLeave && currentMeetingMinutes !== '') {
        // Nếu đang nghỉ cả ngày mà input họp có giá trị (ví dụ do trước đó đã nhập rồi mới chọn nghỉ 8h)
        // thì khi blur, ta không lưu giá trị này (hoặc có thể chủ động xóa nó)
        // Ở đây ta chọn không lưu giá trị mới nếu isFullDayLeave=true và có gì đó trong input
        // Tuy nhiên, logic handleSaveSupplementaryData với resetOvertimeAndMeeting đã xử lý việc này khi chọn 8h
        return;
    }
    const minutesToSave = currentMeetingMinutes === '' ? null : Number(currentMeetingMinutes);
    handleSaveSupplementaryData('meetingMinutes', minutesToSave);
  };


  return (
    <Card style={styles.dailyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDateText}>{`${dailyInfo.dayOfWeek}, ${dailyInfo.formattedDate}`}</Text>
        {weekHasData && <Text style={styles.cardTotalWorkText}>Tổng công: {dailyInfo.totalWorkForDay != null ? dailyInfo.totalWorkForDay.toLocaleString() : '0'}</Text>}
      </View>

      <View style={styles.entriesContainer}>
        {dailyInfo.entries.length > 0 ? (
          dailyInfo.entries.map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              onLongPress={() => {
                if (onAttemptDeleteEntry && entry.id && !isFullDayLeave) { // Không cho xóa entry nếu đang nghỉ cả ngày
                  onAttemptDeleteEntry({
                    id: entry.id, //
                    stageCode: entry.stageCode, //
                    quantity: entry.quantity, //
                  });
                }
              }}
              disabled={isFullDayLeave} // Vô hiệu hóa việc nhấn giữ nếu nghỉ cả ngày
            >
              <View style={[styles.entryRow, isFullDayLeave && styles.disabledTextContainer]}>
                <Text style={[styles.entryStageCode, isFullDayLeave && styles.disabledText]}>{entry.stageCode}</Text>
                <Text style={[styles.entryQuantity, isFullDayLeave && styles.disabledText]}>{entry.quantity.toLocaleString()}</Text>
              </View>
              {dailyInfo.entries.length > 1 && index < dailyInfo.entries.length - 1 && (
                <View style={styles.divider} />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.noEntryText, isFullDayLeave && styles.disabledText]}>Chưa có dữ liệu</Text>
        )}
      </View>

      <View style={styles.footerActionContainer}>
        <TouchableOpacity
          style={[styles.addProductionButton, isFullDayLeave && styles.disabledButton]}
          onPress={() => {
            if (!isFullDayLeave) {
              onAddProduction(dailyInfo.date);
            }
          }}
          disabled={isFullDayLeave}
        >
          <Ionicons name="add-circle-outline" size={22} color={isFullDayLeave ? theme.colors.grey : theme.colors.primary} />
          <Text style={[styles.addProductionButtonText, isFullDayLeave && { color: theme.colors.grey }]}>Thêm sản lượng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Ionicons
            name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={24}
            color={theme.colors.secondary}
          />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={styles.additionalSection}>
          {isLoadingSupp && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingIndicator}/>}
          {/* Nghỉ */}
          <View style={styles.additionalRow}>
            <Text style={styles.additionalLabel}>Nghỉ:</Text>
            <View style={styles.optionsContainer}>
              {HOUR_OPTIONS.map(hours => {
                const isSelected = currentLeaveHours === hours;
                const isDisabled = isFullDayLeave && hours !== 8; // Disable các nút nghỉ khác nếu đang nghỉ 8h
                return (
                  <TouchableOpacity
                    key={`leave-${hours}`}
                    style={[
                      styles.hourOptionButton,
                      isSelected && hours === 8 && styles.hourOptionSelectedFullDayLeave, // Màu đỏ cho nghỉ 8h
                      isSelected && hours !== 8 && styles.hourOptionSelected, // Màu xanh cho các lựa chọn nghỉ khác
                      isDisabled && styles.disabledButton,
                    ]}
                    onPress={() => handleHourOptionPress('leaveHours', hours)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.hourOptionText,
                        isSelected && (hours === 8 ? styles.hourOptionSelectedFullDayLeaveText : styles.hourOptionSelectedText),
                        isDisabled && styles.disabledText,
                      ]}
                    >
                      {`${hours}h`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tăng ca */}
          <View style={styles.additionalRow}>
            <Text style={[styles.additionalLabel, isFullDayLeave && styles.disabledText]}>Tăng ca:</Text>
            <View style={styles.optionsContainer}>
              {HOUR_OPTIONS.map(hours => (
                <TouchableOpacity
                  key={`overtime-${hours}`}
                  style={[
                    styles.hourOptionButton,
                    currentOvertimeHours === hours && styles.hourOptionSelected,
                    isFullDayLeave && styles.disabledButton,
                  ]}
                  onPress={() => handleHourOptionPress('overtimeHours', hours)}
                  disabled={isFullDayLeave}
                >
                  <Text
                    style={[
                      styles.hourOptionText,
                      currentOvertimeHours === hours && styles.hourOptionSelectedText,
                      isFullDayLeave && styles.disabledText,
                    ]}
                  >
                    {`${hours}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Họp/Đào tạo */}
          <View style={styles.additionalRow}>
            <Text style={[styles.additionalLabel, isFullDayLeave && styles.disabledText]}>Họp/Đào tạo:</Text>
            <View style={[styles.meetingInputContainer, isFullDayLeave && styles.disabledInputContainer]}>
              <RNTextInput
                style={[styles.meetingInput, isFullDayLeave && styles.disabledText]}
                value={currentMeetingMinutes}
                onChangeText={handleMeetingMinutesChange}
                onBlur={handleMeetingMinutesBlur}
                keyboardType="numeric"
                placeholder="Số phút"
                placeholderTextColor={isFullDayLeave ? theme.colors.lightGrey : theme.colors.grey}
                editable={!isFullDayLeave}
              />
               <Text style={[styles.unitLabel, isFullDayLeave && styles.disabledText]}>phút</Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  dailyCard: {
    marginVertical: theme.spacing.sm, //
    padding: 0,
    borderRadius: theme.borderRadius.md, //
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor, //
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm, //
    paddingTop: theme.spacing.sm, //
    paddingHorizontal: theme.spacing.md, //
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor, //
    backgroundColor: theme.colors.lightGrey, //
  },
  cardDateText: {
    fontSize: theme.typography.body.fontSize, //
    fontWeight: 'bold',
    color: theme.colors.text, //
  },
  cardTotalWorkText: {
    fontSize: theme.typography.bodySmall.fontSize, //
    fontWeight: 'bold',
    color: theme.colors.info, //
  },
  entriesContainer: {
    paddingBottom: theme.spacing.xs, //
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, //
    paddingVertical: theme.spacing.sm, //
  },
  entryStageCode: {
    fontSize: theme.typography.bodySmall.fontSize, //
    fontWeight: 'bold',
    color: theme.colors.text, //
  },
  entryQuantity: {
    fontSize: theme.typography.bodySmall.fontSize, //
    fontWeight: 'bold',
    color: theme.colors.text, //
  },
  noEntryText: {
    fontSize: theme.typography.bodySmall.fontSize, //
    color: theme.colors.textSecondary, //
    textAlign: 'center',
    paddingVertical: theme.spacing.md, //
    paddingHorizontal: theme.spacing.md, //
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderColor, //
    marginHorizontal: theme.spacing.md, //
  },
  footerActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs, //
    paddingHorizontal: theme.spacing.md, //
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGrey, //
  },
  addProductionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm / 2, //
  },
  addProductionButtonText: {
    marginLeft: theme.spacing.xs, //
    color: theme.colors.primary, //
    fontSize: theme.typography.bodySmall.fontSize, //
    fontWeight: 'bold',
  },
  expandButton: {
    padding: theme.spacing.sm, //
  },
  additionalSection: {
    paddingHorizontal: theme.spacing.md, //
    paddingVertical: theme.spacing.sm, //
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor, //
    backgroundColor: theme.colors.background, //
  },
  additionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm, //
  },
  additionalLabel: {
    fontSize: theme.typography.bodySmall.fontSize, //
    color: theme.colors.textSecondary, //
    marginRight: theme.spacing.sm, //
    flex: 0.3,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    flex: 0.7,
  },
  hourOptionButton: {
    height: 28,
    minWidth: 40,
    paddingHorizontal: theme.spacing.sm, //
    paddingVertical: theme.spacing.xs, //
    borderRadius: theme.borderRadius.sm, //
    borderColor: theme.colors.primary, //
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hourOptionSelected: {
    backgroundColor: theme.colors.primary, //
  },
  hourOptionSelectedFullDayLeave: { // Style mới cho nút nghỉ 8h khi được chọn
    backgroundColor: theme.colors.danger, //
    borderColor: theme.colors.danger, //
  },
  hourOptionText: {
    fontSize: theme.typography.caption.fontSize, //
    color: theme.colors.primary, //
  },
  hourOptionSelectedText: {
    color: theme.colors.white, //
  },
  hourOptionSelectedFullDayLeaveText: { // Style mới cho text của nút nghỉ 8h
    color: theme.colors.white, //
  },
  meetingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.69,
    borderWidth: 1,
    borderColor: theme.colors.primary, //
    borderRadius: theme.borderRadius.sm, //
  },
  meetingInput: {
    flex: 1,
    height: 30,
    fontSize: theme.typography.bodySmall.fontSize, //
    paddingLeft: theme.spacing.sm, //
    color: theme.colors.text, //
  },
  unitLabel: {
    fontSize: theme.typography.bodySmall.fontSize, //
    color: theme.colors.textSecondary, //
    paddingHorizontal: theme.spacing.sm, //
  },
  loadingIndicator: { // Đã đổi tên từ loadingText để phù hợp hơn
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
  },
  disabledButton: { // Style cho các nút bị vô hiệu hóa
    backgroundColor: theme.colors.lightGrey, //
    borderColor: theme.colors.grey, //
    opacity: 0.7,
  },
  disabledText: { // Style cho text của các thành phần bị vô hiệu hóa
    color: theme.colors.grey, //
  },
  disabledTextContainer: { // Dùng cho View chứa text bị disable (ví dụ entryRow)
    opacity: 0.6,
  },
  disabledInputContainer: { // Style cho container của input bị vô hiệu hóa
    backgroundColor: theme.colors.lightGrey, //
    borderColor: theme.colors.grey, //
    opacity: 0.7,
  }
});

export default DailyProductionCard;