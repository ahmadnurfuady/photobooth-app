import React from 'react';

interface Props {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtext?: string;
}

export default function StatCard({ label, value, icon, subtext }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      {icon && (
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          {icon}
        </div>
      )}
    </div>
  );
}