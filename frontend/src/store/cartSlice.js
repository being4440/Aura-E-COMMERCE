import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCartAPI, addToCartAPI, updateQtyAPI, removeItemAPI, clearCartAPI } from '../api/api';
import { normalizeProduct } from '../utils/normalizeProduct';

const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,
  error: null
};

// ─── Helper: recompute totals from items array ──────────────────────────────
const computeTotals = (items) => ({
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: items.reduce((sum, i) => {
    const price = i.product.price;
    return sum + i.quantity * price;
  }, 0)
});

// ─── Async Thunks ───────────────────────────────────────────────────────────
export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const res = await getCartAPI();
    return res.data;
  } catch (err) {
    return rejectWithValue({
      message: err.response?.data?.message || 'Failed to fetch cart',
      status: err.response?.status
    });
  }
});

export const addToCart = createAsyncThunk('cart/addToCart', async (productData, { rejectWithValue }) => {
  try {
    const res = await addToCartAPI(productData);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add item to cart');
  }
});

export const updateQuantity = createAsyncThunk('cart/updateQuantity', async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    const res = await updateQtyAPI(itemId, quantity);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update quantity');
  }
});

export const removeFromCart = createAsyncThunk('cart/removeFromCart', async (itemId, { rejectWithValue }) => {
  try {
    const res = await removeItemAPI(itemId);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove item');
  }
});

export const clearCart = createAsyncThunk('cart/clearCart', async (_, { rejectWithValue }) => {
  try {
    const res = await clearCartAPI();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clear cart');
  }
});

// ─── Slice ──────────────────────────────────────────────────────────────────
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCartState: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalPrice = 0;
      state.isLoading = false;
      state.error = null;
    },
    // Optimistic: instantly add item to local state
    optimisticAdd: (state, action) => {
      const product = normalizeProduct(action.payload);
      const { productId, size, color, stock } = product;
      
      const existingIdx = state.items.findIndex(
        i => i.product.productId === productId && (i.size || i.product.size) === size && (i.color || i.product.color) === color
      );
      if (existingIdx > -1) {
        const item = state.items[existingIdx];
        item.quantity = Math.min(item.quantity + 1, stock ?? 10);
      } else {
        // Temp _id so CartItem renders without crashing
        state.items.push({
          _id: `optimistic_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          product,
          quantity: 1
        });
      }
      const totals = computeTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;
    },
    // Optimistic: instantly remove item
    optimisticRemove: (state, action) => {
      state.items = state.items.filter(i => (i._id || i.id) !== action.payload);
      const totals = computeTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;
    },
    // Optimistic: instantly change quantity
    optimisticUpdateQty: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(i => (i._id || i.id) === itemId);
      if (item) item.quantity = quantity;
      const totals = computeTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;
    },
  },
  extraReducers: (builder) => {
    // Sync state from server response (source of truth)
    const syncFromServer = (state, action) => {
      if (action.payload?.data) {
        let { items, totalItems, totalPrice } = action.payload.data;
        
        // Normalize all products received from the server
        items = (items || []).map(item => ({
          ...item,
          product: normalizeProduct(item.product)
        }));
        
        state.items = items;
        state.totalItems = totalItems ?? computeTotals(items || []).totalItems;
        state.totalPrice = totalPrice ?? computeTotals(items || []).totalPrice;
      }
    };

    builder
      .addCase(fetchCart.pending,    (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCart.fulfilled,  (state, action) => { state.isLoading = false; syncFromServer(state, action); })
      .addCase(fetchCart.rejected,   (state, action) => {
        state.isLoading = false;
        if (action.payload?.status === 401) {
          state.items = []; state.totalItems = 0; state.totalPrice = 0; state.error = null;
        } else {
          state.error = action.payload?.message || 'Failed to fetch cart';
        }
      })
      // On success, sync the real server state (replaces optimistic temp IDs with real _ids)
      .addCase(addToCart.fulfilled,      (state, action) => { syncFromServer(state, action); })
      .addCase(updateQuantity.fulfilled,  (state, action) => { syncFromServer(state, action); })
      .addCase(removeFromCart.fulfilled,  (state, action) => { syncFromServer(state, action); })
      .addCase(clearCart.fulfilled, (state) => {
        state.items = []; state.totalItems = 0; state.totalPrice = 0;
      });
  },
});

export const { resetCartState, optimisticAdd, optimisticRemove, optimisticUpdateQty } = cartSlice.actions;
export default cartSlice.reducer;
