import React from 'react';
import { useDispatch } from 'react-redux';
import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';
import { updateQuantity, removeFromCart, optimisticRemove, optimisticUpdateQty } from '../store/cartSlice';
import { toast } from 'react-hot-toast';

const CartItem = ({ item }) => {
  const dispatch = useDispatch();
  // Support both _id (Mongoose subdoc) and id (serialized)
  const itemId = item._id || item.id;
  const { product, quantity } = item;
  const priceToUse = product?.price ?? 0;

  const handleDecrease = async () => {
    if (quantity === 1) {
      handleRemove();
    } else {
      // ⚡ Instant UI update
      dispatch(optimisticUpdateQty({ itemId, quantity: quantity - 1 }));
      const result = await dispatch(updateQuantity({ itemId, quantity: quantity - 1 }));
      if (!updateQuantity.fulfilled.match(result)) {
        // Revert on failure
        dispatch(optimisticUpdateQty({ itemId, quantity }));
        toast.error(result.payload || 'Failed to update quantity');
      }
    }
  };

  const handleIncrease = async () => {
    const maxQty = product?.stock ?? 10;
    if (quantity < maxQty) {
      // ⚡ Instant UI update
      dispatch(optimisticUpdateQty({ itemId, quantity: quantity + 1 }));
      const result = await dispatch(updateQuantity({ itemId, quantity: quantity + 1 }));
      if (!updateQuantity.fulfilled.match(result)) {
        dispatch(optimisticUpdateQty({ itemId, quantity }));
        toast.error(result.payload || 'Failed to update quantity');
      }
    } else {
      toast.error(`Maximum available stock is ${maxQty}`);
    }
  };

  const handleRemove = async () => {
    // ⚡ Remove instantly from UI
    dispatch(optimisticRemove(itemId));
    const result = await dispatch(removeFromCart(itemId));
    if (removeFromCart.fulfilled.match(result)) {
      toast.success('Item removed from cart');
    } else {
      toast.error(result.payload || 'Failed to remove item');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 py-4 border-b border-gray-700/50 relative">
      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-800 rounded flex-shrink-0 overflow-hidden">
        {product?.images?.[0] ? (
          <img src={product.images[0]} alt={product?.title || 'Item'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Image</div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-white">{product?.title || 'Unknown Product'}</h3>
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              title="Remove item"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
          {product?.brand && <p className="text-sm text-gray-400 mb-1">{product.brand}</p>}
          <div className="flex gap-3 text-xs text-gray-500 mb-2">
            {(item.size || product?.size) && <span className="uppercase">Size: {item.size || product.size}</span>}
            {(item.color || product?.color) && <span className="uppercase">Color: {item.color || product.color}</span>}
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex items-center border border-gray-600 rounded bg-gray-800/50">
            <button onClick={handleDecrease} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-l">
              <FiMinus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-medium text-white">{quantity}</span>
            <button onClick={handleIncrease} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-r">
              <FiPlus size={14} />
            </button>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {quantity} × ₹{priceToUse.toLocaleString('en-IN')}
            </div>
            <div className="text-lg font-bold text-white">
              ₹{(quantity * priceToUse).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
