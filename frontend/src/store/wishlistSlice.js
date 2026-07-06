import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getWishlistAPI, addToWishlistAPI, removeFromWishlistAPI } from '../api/api';

const initialState = {
  items: [],
  isLoading: false,
  error: null
};

export const fetchWishlist = createAsyncThunk('wishlist/fetchWishlist', async (_, { rejectWithValue }) => {
  try {
    const res = await getWishlistAPI();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch wishlist');
  }
});

export const toggleWishlistItem = createAsyncThunk('wishlist/toggleWishlistItem', async (product, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const isWishlisted = state.wishlist.items.some(p => (p._id || p) === product._id);
    if (isWishlisted) {
      await removeFromWishlistAPI(product._id);
      return { action: 'removed', productId: product._id };
    } else {
      await addToWishlistAPI(product._id);
      return { action: 'added', product };
    }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to toggle wishlist');
  }
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlistState: (state) => {
      state.items = [];
      state.isLoading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload?.products || [];
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        if (action.payload.action === 'added') {
          if (!state.items.some(p => (p._id || p) === action.payload.product._id)) {
            state.items.push(action.payload.product);
          }
        } else {
          state.items = state.items.filter(p => (p._id || p) !== action.payload.productId);
        }
      });
  }
});

export const { resetWishlistState } = wishlistSlice.actions;
export default wishlistSlice.reducer;
