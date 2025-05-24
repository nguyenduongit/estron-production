// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
// Đảm bảo đường dẫn đúng tới types của bạn
import { Quota, ProductionEntry, DailySupplementaryData } from '../types/data'; // SỬA ĐƯỜNG DẪN NÀY nếu cần
import 'react-native-get-random-values'; // Cần cho uuid
import { v4 as uuidv4 } from 'uuid';

const QUOTAS_KEY = 'ESTRON_APP_QUOTAS_V1';
const PRODUCTION_ENTRIES_KEY = 'ESTRON_APP_PRODUCTION_ENTRIES_V1';
// ++ THÊM MỚI KEY ++
const SUPPLEMENTARY_DATA_KEY = 'ESTRON_APP_SUPPLEMENTARY_DATA_V1';
// ++ KẾT THÚC THÊM MỚI KEY ++

// --- Quota Management (Định mức) ---
// ... (các hàm quản lý Quota không đổi) ...
export const getQuotasFromStorage = async (): Promise<Quota[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(QUOTAS_KEY);
    const quotas = jsonValue != null ? JSON.parse(jsonValue) : [];
    // Sắp xếp theo thuộc tính 'order' nếu có
    return quotas.sort((a: Quota, b: Quota) => a.order - b.order);
  } catch (e) {
    console.error("Lỗi khi tải định mức:", e);
    return [];
  }
};

export const saveQuotasToStorage = async (quotas: Quota[]): Promise<boolean> => {
  try {
    // Đảm bảo thuộc tính 'order' được cập nhật dựa trên vị trí trong mảng
    const sortedAndOrderedQuotas = quotas.map((q, index) => ({ ...q, order: index }));
    const jsonValue = JSON.stringify(sortedAndOrderedQuotas);
    await AsyncStorage.setItem(QUOTAS_KEY, jsonValue);
    return true;
  } catch (e) {
    console.error("Lỗi khi lưu định mức:", e);
    return false;
  }
};

export const addQuotaToStorage = async (newQuotaData: Omit<Quota, 'id' | 'order'>): Promise<Quota | null> => {
  try {
    const quotas = await getQuotasFromStorage();
    if (quotas.some(q => q.stageCode.trim().toLowerCase() === newQuotaData.stageCode.trim().toLowerCase())) {
      console.warn(`Mã công đoạn '${newQuotaData.stageCode}' đã tồn tại.`);
      return null;
    }
    const newQuota: Quota = {
      ...newQuotaData,
      id: uuidv4(),
      order: quotas.length, // Thêm vào cuối
    };
    const updatedQuotas = [...quotas, newQuota];
    await saveQuotasToStorage(updatedQuotas);
    return newQuota;
  } catch (e) {
    console.error("Lỗi khi thêm định mức:", e);
    return null;
  }
};

export const deleteQuotaFromStorage = async (quotaIdToDelete: string): Promise<boolean> => {
  try {
    let quotas = await getQuotasFromStorage();
    quotas = quotas.filter(q => q.id !== quotaIdToDelete);
    return await saveQuotasToStorage(quotas);
  } catch (e) {
    console.error("Lỗi khi xóa định mức:", e);
    return false;
  }
};

export const updateQuotaInStorage = async (updatedQuota: Quota): Promise<Quota | null> => {
    try {
        const quotas = await getQuotasFromStorage();
        const index = quotas.findIndex(q => q.id === updatedQuota.id);
        if (index === -1) {
            console.warn(`Không tìm thấy định mức với ID: ${updatedQuota.id} để cập nhật.`);
            return null;
        }
        if (quotas.some(q => q.id !== updatedQuota.id && q.stageCode.trim().toLowerCase() === updatedQuota.stageCode.trim().toLowerCase())) {
            console.warn(`Mã công đoạn '${updatedQuota.stageCode}' đã tồn tại cho một định mức khác.`);
            return null;
        }

        quotas[index] = { ...quotas[index], ...updatedQuota };
        await saveQuotasToStorage(quotas);
        return quotas[index];
    } catch (e) {
        console.error("Lỗi khi cập nhật định mức:", e);
        return null;
    }
};

// --- Production Entry Management (Nhập sản lượng) ---
// ... (các hàm quản lý ProductionEntry không đổi) ...
export const getProductionEntriesFromStorage = async (): Promise<ProductionEntry[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(PRODUCTION_ENTRIES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Lỗi khi tải dữ liệu sản lượng:", e);
    return [];
  }
};

export const saveProductionEntriesToStorage = async (entries: ProductionEntry[]): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(entries);
    await AsyncStorage.setItem(PRODUCTION_ENTRIES_KEY, jsonValue);
    return true;
  } catch (e) {
    console.error("Lỗi khi lưu dữ liệu sản lượng:", e);
    return false;
  }
};

export const addOrUpdateProductionEntryInStorage = async (
  entryData: Omit<ProductionEntry, 'id'>
): Promise<ProductionEntry | null> => {
  try {
    let entries = await getProductionEntriesFromStorage();
    const existingEntryIndex = entries.findIndex(
      e => e.date === entryData.date && e.stageCode === entryData.stageCode
    );

    let resultEntry: ProductionEntry;

    if (existingEntryIndex > -1) {
      entries[existingEntryIndex].quantity = entryData.quantity;
      resultEntry = entries[existingEntryIndex];
    } else {
      const newEntry: ProductionEntry = {
        ...entryData,
        id: uuidv4(),
      };
      entries.push(newEntry);
      resultEntry = newEntry;
    }
    await saveProductionEntriesToStorage(entries);
    return resultEntry;
  } catch (e) {
    console.error("Lỗi khi thêm/cập nhật sản lượng:", e);
    return null;
  }
};

export const getProductionEntriesByDateFromStorage = async (date: string): Promise<ProductionEntry[]> => {
  const allEntries = await getProductionEntriesFromStorage();
  return allEntries.filter(entry => entry.date === date);
};

export const getProductionEntriesByDateRangeFromStorage = async (
  startDate: string, // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
): Promise<ProductionEntry[]> => {
  const allEntries = await getProductionEntriesFromStorage();
  return allEntries.filter(entry => entry.date >= startDate && entry.date <= endDate);
};

export const deleteProductionEntryFromStorage = async (entryId: string): Promise<boolean> => {
    try {
        let entries = await getProductionEntriesFromStorage();
        entries = entries.filter(e => e.id !== entryId);
        return await saveProductionEntriesToStorage(entries);
    } catch (e) {
        console.error("Lỗi khi xóa sản lượng:", e);
        return false;
    }
};

// --- Daily Supplementary Data Management (Nghỉ, Tăng ca, Họp) ---
// ++ THÊM MỚI CÁC HÀM SAU ++
export const getAllSupplementaryDataFromStorage = async (): Promise<DailySupplementaryData[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(SUPPLEMENTARY_DATA_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Lỗi khi tải dữ liệu phụ trợ:", e);
    return [];
  }
};

export const saveAllSupplementaryDataToStorage = async (data: DailySupplementaryData[]): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(SUPPLEMENTARY_DATA_KEY, jsonValue);
    return true;
  } catch (e) {
    console.error("Lỗi khi lưu dữ liệu phụ trợ:", e);
    return false;
  }
};

/**
 * Thêm hoặc cập nhật dữ liệu phụ trợ cho một ngày cụ thể.
 * @param entryToUpdate Dữ liệu cần lưu, bao gồm 'date' và các trường khác (leaveHours, overtimeHours, meetingMinutes).
 * Nếu một trường không được cung cấp, nó sẽ không được cập nhật (giữ giá trị cũ nếu có).
 * Nếu một trường được cung cấp là null, nó sẽ được xóa/đặt thành null.
 */
export const addOrUpdateDailySupplementaryData = async (
  entryToUpdate: DailySupplementaryData
): Promise<DailySupplementaryData | null> => {
  try {
    let allSuppData = await getAllSupplementaryDataFromStorage();
    const existingEntryIndex = allSuppData.findIndex(e => e.date === entryToUpdate.date);

    if (existingEntryIndex > -1) {
      // Cập nhật entry hiện có, chỉ cập nhật các trường được cung cấp trong entryToUpdate
      const existingEntry = allSuppData[existingEntryIndex];
      allSuppData[existingEntryIndex] = {
        ...existingEntry,
        ...entryToUpdate, // Ghi đè các trường được cung cấp
      };
       // Xử lý trường hợp muốn xóa (set về null)
      if (entryToUpdate.leaveHours === null) allSuppData[existingEntryIndex].leaveHours = null;
      if (entryToUpdate.overtimeHours === null) allSuppData[existingEntryIndex].overtimeHours = null;
      if (entryToUpdate.meetingMinutes === null) allSuppData[existingEntryIndex].meetingMinutes = null;

    } else {
      // Thêm mới entry nếu chưa có cho ngày đó
      allSuppData.push(entryToUpdate);
    }

    // Lọc ra các entry không có giá trị nào (tất cả đều null hoặc undefined ngoài date)
    // để tránh lưu các object rỗng nếu người dùng bỏ chọn hết.
    allSuppData = allSuppData.filter(entry =>
        entry.leaveHours != null || entry.overtimeHours != null || entry.meetingMinutes != null
    );


    await saveAllSupplementaryDataToStorage(allSuppData);
    // Trả về entry đã được cập nhật hoặc thêm mới từ mảng đã lọc
    const finalEntry = allSuppData.find(e => e.date === entryToUpdate.date);
    return finalEntry || null;

  } catch (e) {
    console.error("Lỗi khi thêm/cập nhật dữ liệu phụ trợ:", e);
    return null;
  }
};

export const getSupplementaryDataByDateFromStorage = async (date: string): Promise<DailySupplementaryData | null> => {
  const allSuppData = await getAllSupplementaryDataFromStorage();
  return allSuppData.find(entry => entry.date === date) || null;
};

export const getSupplementaryDataByDateRangeFromStorage = async (
  startDate: string, // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
): Promise<DailySupplementaryData[]> => {
  const allSuppData = await getAllSupplementaryDataFromStorage();
  return allSuppData.filter(entry => entry.date >= startDate && entry.date <= endDate);
};
// ++ KẾT THÚC THÊM MỚI CÁC HÀM ++

// Hàm tiện ích để xóa toàn bộ dữ liệu (dùng cho testing)
export const clearAllData = async () => {
    try {
        await AsyncStorage.removeItem(QUOTAS_KEY);
        await AsyncStorage.removeItem(PRODUCTION_ENTRIES_KEY);
        // ++ THÊM MỚI ++
        await AsyncStorage.removeItem(SUPPLEMENTARY_DATA_KEY);
        // ++ KẾT THÚC THÊM MỚI ++
        console.log("Đã xóa toàn bộ dữ liệu.");
    } catch (e) {
        console.error("Lỗi khi xóa toàn bộ dữ liệu:", e);
    }
}