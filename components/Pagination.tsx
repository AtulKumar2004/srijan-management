"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const [inputVal, setInputVal] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitPage();
    }
  };

  const commitPage = () => {
    let pageNum = parseInt(inputVal, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    } else if (pageNum > totalPages) {
      pageNum = totalPages;
    }
    setInputVal(String(pageNum));
    if (pageNum !== currentPage) {
      onPageChange(pageNum);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 my-4 py-2 select-none">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="p-1.5 sm:p-2 rounded-lg bg-[#A65353] text-white disabled:opacity-40 hover:bg-[#8e4545] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
        title="Previous Page"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-300 shadow-sm text-sm sm:text-base font-semibold text-gray-700">
        <span>Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={commitPage}
          className="w-12 sm:w-14 text-center px-1 py-0.5 border border-gray-300 rounded font-bold text-[#A65353] focus:outline-none focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] bg-gray-50"
        />
        <span>of {totalPages}</span>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="p-1.5 sm:p-2 rounded-lg bg-[#A65353] text-white disabled:opacity-40 hover:bg-[#8e4545] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
        title="Next Page"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}
