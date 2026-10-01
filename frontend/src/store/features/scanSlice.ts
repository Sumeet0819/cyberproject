import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ScanState {
  isScanning: boolean;
  activeScanId: string | null;
  filter: 'ALL' | 'QUICK_WINS' | 'HIGH_IMPACT';
}

const initialState: ScanState = {
  isScanning: false,
  activeScanId: null,
  filter: 'ALL',
};

const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    setScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    setActiveScanId(state, action: PayloadAction<string | null>) {
      state.activeScanId = action.payload;
    },
    setFilter(state, action: PayloadAction<ScanState['filter']>) {
      state.filter = action.payload;
    },
  },
});

export const { setScanning, setActiveScanId, setFilter } = scanSlice.actions;
export default scanSlice.reducer;
