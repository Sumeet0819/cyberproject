import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Website {
  id: string;
  user_id: string;
  domain: string;
  target_url: string;
  created_at: string;
  score?: number;
  grade?: string;
  last_scan_at?: string;
  lastScan?: string;
  is_verified?: boolean;
  verified_at?: string | null;
  verification_method?: string | null;
  monitoring_enabled?: boolean;
  monitoring_frequency?: 'daily' | 'weekly' | 'monthly';
  last_monitored_at?: string | null;
  notification_email?: string | null;
  webhook_url?: string | null;
}

interface WebsiteState {
  websites: Website[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WebsiteState = {
  websites: [],
  isLoading: false,
  error: null,
};

export const fetchWebsites = createAsyncThunk('website/fetchWebsites', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/websites');
    if (!res.ok) {
      const err = await res.json();
      return rejectWithValue(err.error || 'Failed to fetch websites');
    }
    const data = await res.json();
    return data.data as Website[];
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

export const addWebsite = createAsyncThunk('website/addWebsite', async (domain: string, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      return rejectWithValue(data.error || 'Failed to add website');
    }
    return data.data as Website;
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

export const scanWebsite = createAsyncThunk('website/scanWebsite', async (websiteId: string, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/websites/${websiteId}/scan`, {
      method: 'POST',
    });

    if (!res.ok) {
      // Safely parse error — body may be plain text if backend crashed
      let errorMsg = 'Failed to scan website';
      try {
        const err = await res.json();
        errorMsg = err.error || errorMsg;
      } catch {
        errorMsg = await res.text().catch(() => errorMsg);
      }
      return rejectWithValue(errorMsg);
    }

    const data = await res.json();
    return data.data; // The returned Report object
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

const websiteSlice = createSlice({
  name: 'website',
  initialState,
  reducers: {
    clearWebsitesError(state) {
      state.error = null;
    },
    setWebsiteVerified(
      state,
      action: PayloadAction<{
        websiteId: string;
        is_verified: boolean;
        verified_at?: string;
        verification_method?: string;
      }>
    ) {
      const { websiteId, is_verified, verified_at, verification_method } = action.payload;
      const target = state.websites.find(w => w.id === websiteId);
      if (target) {
        target.is_verified = is_verified;
        if (verified_at !== undefined) target.verified_at = verified_at;
        if (verification_method !== undefined) target.verification_method = verification_method;
      }
    },
    setWebsiteMonitoring(
      state,
      action: PayloadAction<{
        websiteId: string;
        monitoring_enabled: boolean;
        monitoring_frequency?: 'daily' | 'weekly' | 'monthly';
        notification_email?: string | null;
        webhook_url?: string | null;
      }>
    ) {
      const { websiteId, monitoring_enabled, monitoring_frequency, notification_email, webhook_url } = action.payload;
      const target = state.websites.find(w => w.id === websiteId);
      if (target) {
        target.monitoring_enabled = monitoring_enabled;
        if (monitoring_frequency) target.monitoring_frequency = monitoring_frequency;
        if (notification_email !== undefined) target.notification_email = notification_email;
        if (webhook_url !== undefined) target.webhook_url = webhook_url;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch websites
      .addCase(fetchWebsites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebsites.fulfilled, (state, action) => {
        state.websites = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchWebsites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add website
      .addCase(addWebsite.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addWebsite.fulfilled, (state, action) => {
        state.websites = [action.payload, ...state.websites];
        state.isLoading = false;
      })
      .addCase(addWebsite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Scan website
      .addCase(scanWebsite.pending, (state) => {
        // Not setting global isLoading to true so we don't block the UI, 
        // local state in the component handles the specific row's loading spinner.
        state.error = null;
      })
      .addCase(scanWebsite.fulfilled, (state, action) => {
        const report = action.payload;
        const websiteIndex = state.websites.findIndex(w => w.id === report.website_id);
        if (websiteIndex !== -1) {
          const scanTime = report.created_at || new Date().toISOString();
          state.websites[websiteIndex] = {
            ...state.websites[websiteIndex],
            score: report.score,
            grade: report.grade,
            last_scan_at: scanTime,
            lastScan: scanTime
          };
        }
      })
      .addCase(scanWebsite.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const { clearWebsitesError, setWebsiteVerified, setWebsiteMonitoring } = websiteSlice.actions;
export default websiteSlice.reducer;
