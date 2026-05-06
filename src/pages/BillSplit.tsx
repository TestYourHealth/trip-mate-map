import React from 'react';
import BillSplitter from '@/components/BillSplitter';

const BillSplit = () => {
  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Bill Splitter</h1>
        <p className="text-sm text-muted-foreground">Split trip costs and expenses with friends</p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
        <BillSplitter />
      </div>
    </div>
  );
};

export default BillSplit;
