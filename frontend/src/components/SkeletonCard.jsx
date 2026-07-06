import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow animate-pulse w-full">
      {/* Image Area */}
      <div className="w-full h-64 bg-gray-200 rounded-t-lg"></div>
      
      <div className="p-4">
        {/* Title Area */}
        <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded-full w-1/2 mb-4"></div>
        
        {/* Price Area */}
        <div className="h-6 bg-gray-200 rounded-full w-1/3 mb-6"></div>
        
        {/* Button Area */}
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
