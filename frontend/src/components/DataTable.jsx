import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  FileSpreadsheet,
  FileJson,
  Search,
  ExternalLink,
  Star,
  Phone,
  Mail,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import Tooltip from './Tooltip';

export default function DataTable({
  leads = [],
  csvFilename = null,
  targetGoal = 100,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('index');
  const [sortDirection, setSortDirection] = useState('desc');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted leads
  const processedLeads = useMemo(() => {
    let result = [...leads];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.whatsapp?.toLowerCase().includes(q) ||
          item.address?.toLowerCase().includes(q) ||
          item.website?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (sortField === 'index') {
        aVal = a.index || 0;
        bVal = b.index || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortField === 'rating') {
        aVal = parseFloat(a.rating) || 0;
        bVal = parseFloat(b.rating) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const comp = aVal.toString().localeCompare(bVal.toString(), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [leads, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages =
    pageSize === -1 ? 1 : Math.ceil(processedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    if (pageSize === -1) return processedLeads;
    const start = (currentPage - 1) * pageSize;
    return processedLeads.slice(start, start + pageSize);
  }, [processedLeads, currentPage, pageSize]);

  // Export to Client CSV
  const exportClientCSV = () => {
    if (!processedLeads.length) return;
    const headers = [
      '#',
      'Name',
      'Category',
      'Phone',
      'Email',
      'WhatsApp',
      'Rating',
      'Reviews',
      'Website',
      'Address',
      'Maps URL',
    ];
    const rows = processedLeads.map((item) => [
      item.index,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.phone || '').replace(/"/g, '""')}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.whatsapp || '').replace(/"/g, '""')}"`,
      item.rating || '',
      item.reviews_count || '',
      `"${(item.website || '').replace(/"/g, '""')}"`,
      `"${(item.address || '').replace(/"/g, '""')}"`,
      `"${(item.url || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${Date.now()}.csv`;
    link.click();
  };

  // Export to JSON
  const exportJSON = () => {
    if (!processedLeads.length) return;
    const jsonStr = JSON.stringify(processedLeads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${Date.now()}.json`;
    link.click();
  };

  // Copy to Clipboard
  const copyToClipboard = () => {
    if (!processedLeads.length) return;
    const text = processedLeads
      .map(
        (item) =>
          `${item.name}\t${item.phone || 'N/A'}\t${item.email || 'N/A'}\t${
            item.whatsapp || 'N/A'
          }\t${item.website || 'N/A'}\t${item.address || 'N/A'}`
      )
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-12">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Live Extracted Leads
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {leads.length.toLocaleString()} leads
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-wrapping columns &bull; Hover for full text tooltips &bull; Instant sorting &amp; filter
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {csvFilename && (
            <a
              href={`/api/download/${csvFilename}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Server CSV
            </a>
          )}

          <button
            onClick={exportClientCSV}
            disabled={!processedLeads.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            onClick={exportJSON}
            disabled={!processedLeads.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>

          <button
            onClick={copyToClipboard}
            disabled={!processedLeads.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Page Size Toolbar */}
      <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, phone, email, address..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-slate-600 justify-end">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => handleSort('index')}
                className="py-3 px-3 w-12 text-center cursor-pointer select-none"
              >
                <div className="inline-flex items-center gap-1 justify-center">
                  # {renderSortIcon('index')}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 w-[22%] cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Name &amp; Category {renderSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('phone')}
                className="py-3 px-3 w-[13%] cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Mobile / Phone {renderSortIcon('phone')}
                </div>
              </th>
              <th
                onClick={() => handleSort('email')}
                className="py-3 px-3 w-[17%] cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Email {renderSortIcon('email')}
                </div>
              </th>
              <th className="py-3 px-3 w-[12%]">WhatsApp</th>
              <th
                onClick={() => handleSort('rating')}
                className="py-3 px-3 w-[10%] cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Rating {renderSortIcon('rating')}
                </div>
              </th>
              <th className="py-3 px-3 w-[8%] text-center">Website</th>
              <th className="py-3 px-3 w-[18%]">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {searchTerm
                    ? `No matching leads found for "${searchTerm}".`
                    : 'No leads extracted yet. Configure your search above and click Start!'}
                </td>
              </tr>
            ) : (
              paginatedLeads.map((item, idx) => {
                const nameTooltipText = `${item.name || ''}${
                  item.category ? ` • ${item.category}` : ''
                }`;
                const phoneTooltipText = item.phone || 'N/A';
                const emailTooltipText = item.email || 'N/A';
                const waTooltipText = item.whatsapp || 'N/A';
                const addressTooltipText = item.address || 'N/A';
                const ratingTooltipText = item.rating
                  ? `Rating: ${item.rating} from ${item.reviews_count || 0} reviews`
                  : 'N/A';
                const siteTooltipText = item.website || 'N/A';

                return (
                  <tr
                    key={item.id || item.index || idx}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                      {item.index}
                    </td>

                    {/* Name & Category */}
                    <td className="py-2.5 px-3">
                      <Tooltip text={nameTooltipText}>
                        <div className="clamp-2 cursor-pointer">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {item.name}
                            </a>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {item.name}
                            </span>
                          )}
                          {item.category && (
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3">
                      {item.phone ? (
                        <Tooltip text={phoneTooltipText}>
                          <a
                            href={`tel:${item.phone}`}
                            className="font-medium text-slate-800 hover:text-blue-600 truncate block max-w-full"
                          >
                            {item.phone}
                          </a>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="py-2.5 px-3">
                      {item.email ? (
                        <Tooltip text={emailTooltipText}>
                          <a
                            href={`mailto:${item.email.split(',')[0].trim()}`}
                            className="font-medium text-blue-600 hover:underline clamp-2 block max-w-full"
                          >
                            {item.email}
                          </a>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* WhatsApp */}
                    <td className="py-2.5 px-3">
                      {item.whatsapp ? (
                        <Tooltip text={waTooltipText}>
                          <a
                            href={`https://wa.me/${item.whatsapp.replace(
                              /[^\d+]/g,
                              ''
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-2xs"
                          >
                            <span>WhatsApp</span>
                          </a>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Rating */}
                    <td className="py-2.5 px-3">
                      {item.rating ? (
                        <Tooltip text={ratingTooltipText}>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200/60">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {item.rating}
                            {item.reviews_count && (
                              <span className="text-[10px] text-slate-400">
                                ({item.reviews_count})
                              </span>
                            )}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Website */}
                    <td className="py-2.5 px-3 text-center">
                      {item.website ? (
                        <Tooltip text={siteTooltipText}>
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                          >
                            Visit <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-2.5 px-3">
                      {item.address ? (
                        <Tooltip text={addressTooltipText}>
                          <span className="clamp-2 text-slate-600 text-[11.5px] cursor-pointer">
                            {item.address}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {processedLeads.length > 0 && (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {pageSize === -1
                ? 1
                : Math.min((currentPage - 1) * pageSize + 1, processedLeads.length)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {pageSize === -1
                ? processedLeads.length
                : Math.min(currentPage * pageSize, processedLeads.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900">
              {processedLeads.length.toLocaleString()}
            </span>{' '}
            entries
            {processedLeads.length !== leads.length && (
              <span className="text-slate-400 ml-1">
                (filtered from {leads.length.toLocaleString()} total)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>

              <div className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

