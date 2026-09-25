import { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Building2, 
  Phone, 
  Users, 
  RefreshCw,
  FileCheck,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { leadService } from '../services/leadService';
import { toast } from 'sonner';

export default function VaUpload() {
  const { country } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    importedCount: number;
    filename: string;
    totalRows: number;
  } | null>(null);

  // Fetch leads uploaded by this VA
  const { data: myLeadsResponse, isLoading: isLoadingMyLeads, refetch } = useQuery({
    queryKey: ['va-my-leads', user?.id],
    queryFn: () => leadService.getLeads({
      limit: 50,
    }),
  });

  const allLeads = myLeadsResponse?.data || [];
  // Filter leads uploaded by current user
  const myUploadedLeads = allLeads.filter((l: any) => l.uploadedByVaId === user?.id || !l.uploadedByVaId);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('countryCode', country);
      return leadService.uploadLeadsFile(formData);
    },
    onSuccess: (data: any) => {
      toast.success(`Successfully imported ${data.importedCount || 0} leads into the database!`);
      setUploadResult({
        importedCount: data.importedCount || 0,
        filename: selectedFile?.name || 'leads_file',
        totalRows: data.totalRows || data.importedCount || 0,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['va-my-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to upload leads file. Please check format.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      toast.error('Invalid file format. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a CSV or Excel file to upload');
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    companyName: '',
    companyAddress: '',
    website: '',
    fleetManager: '',
    ceoOwnerName: '',
    phone: '',
    altPhone: '',
    email: '',
    poaEmail: '',
    numberOfUnits: '',
    notes: '',
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: any) => leadService.createLead(data),
    onSuccess: () => {
      toast.success('Fleet lead created and added to unassigned pool!');
      setIsAddModalOpen(false);
      setManualFormData({
        companyName: '',
        companyAddress: '',
        website: '',
        fleetManager: '',
        ceoOwnerName: '',
        phone: '',
        altPhone: '',
        email: '',
        poaEmail: '',
        numberOfUnits: '',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['va-my-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create lead');
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormData.companyName || !manualFormData.phone) {
      toast.error('Company Name and Primary Phone are required');
      return;
    }
    createLeadMutation.mutate({
      companyName: manualFormData.companyName,
      address: manualFormData.companyAddress || undefined,
      website: manualFormData.website || undefined,
      fleetManager: manualFormData.fleetManager || undefined,
      ceoOwnerName: manualFormData.ceoOwnerName || undefined,
      contactPerson: manualFormData.fleetManager || manualFormData.ceoOwnerName || 'Fleet Manager',
      phone: manualFormData.phone,
      altPhone: manualFormData.altPhone || undefined,
      email: manualFormData.email || undefined,
      poaEmail: manualFormData.poaEmail || undefined,
      numberOfUnits: manualFormData.numberOfUnits ? Number(manualFormData.numberOfUnits) : undefined,
      notes: manualFormData.notes || undefined,
      countryCode: country as any,
    });
  };

  const handleDownloadTemplate = () => {
    const headers = 'Company Name,Company Address,Website,Fleet Manager,CEO/Owner Name,Contact Number,Alternative Contact no,Official Email,POA : Email,NOU\n';
    const sampleRow = 'HC&C Contracting,"11904 Woodbine Ave, Whitchurch-Stouffville, ON",https://hcccontracting.ca,Muhammad Naqib,Harry Henderson,+1 (647) 828-1186,+1 (647) 555-0144,fleet@axo1corp.com,invoices@hcccontracting.ca,100\n';
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'xtreme_fleet_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="VA Lead Intake & Spreadsheets"
        subtitle={`Upload prospect lists in CSV or Excel. System stores records into PostgreSQL and feeds active call agents.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Plus size={14} />
              <span>Add Fleet Lead</span>
            </button>
            <a
              href="/Data Base Sample.xlsx"
              download="Data Base Sample.xlsx"
              className="btn-secondary flex items-center gap-1.5 cursor-pointer text-xs"
              title="Download standardized .xlsx spreadsheet template"
            >
              <Download size={14} />
              <span>Download Excel Sample</span>
            </a>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn-secondary flex items-center gap-1.5 cursor-pointer text-xs"
              title="Download CSV format template"
            >
              <Download size={14} />
              <span>Download CSV Template</span>
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary px-2.5 py-2 cursor-pointer"
              title="Refresh upload stats"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* KPI Stats for VA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Uploaded
            </div>
            <FileSpreadsheet className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {myUploadedLeads.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Prospect leads submitted to database
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              In Call Queue
            </div>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-700 mt-2">
            {myUploadedLeads.filter((l: any) => l.status === 'NEW' || l.status === 'CALLED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pending agent qualification & disposition
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Converted Fleets
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2">
            {myUploadedLeads.filter((l: any) => l.status === 'CONVERTED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Successfully closed fleet accounts
          </div>
        </div>
      </div>

      {/* Main Upload Box */}
      <Card title="Upload Leads File" icon={UploadCloud}>
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-red-600 bg-red-50/50 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <FileCheck size={26} />
                </div>
                <div className="font-bold text-slate-900 text-sm">{selectedFile.name}</div>
                <div className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag another file to replace
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <UploadCloud size={26} />
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  Click to select or drag and drop your spreadsheet here
                </div>
                <div className="text-xs text-slate-500">
                  Supports <span className="font-semibold text-slate-700">.CSV</span>,{' '}
                  <span className="font-semibold text-slate-700">.XLSX</span>, and{' '}
                  <span className="font-semibold text-slate-700">.XLS</span> files
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-slate-400" />
              <span>
                Region: <strong className="text-slate-700 font-semibold">{country}</strong>. Leads will be saved to this operating territory.
              </span>
            </div>

            <button
              type="button"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={handleUpload}
              className={`btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold cursor-pointer ${
                !selectedFile || uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Saving to Postgres...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Import Leads to Database</span>
                </>
              )}
            </button>
          </div>

          {/* Success Banner */}
          {uploadResult && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in duration-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs">Import Successful!</h5>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Imported <span className="font-bold">{uploadResult.importedCount}</span> leads from{' '}
                  <span className="font-mono text-emerald-950 font-semibold">{uploadResult.filename}</span>.
                  These leads are now available in the unassigned pool for call agents.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Uploaded Leads Table */}
      <Card title="Recently Uploaded Leads" icon={Building2}>
        {isLoadingMyLeads ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading leads...</div>
        ) : myUploadedLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No leads uploaded yet. Use the upload box above to import your first spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Units</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myUploadedLeads.slice(0, 10).map((ld: any) => (
                  <tr key={ld.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{ld.companyName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{ld.contactPerson}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" />
                      <span>{ld.phone}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{ld.numberOfUnits || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          ld.status === 'CONVERTED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : ld.status === 'NEW'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {ld.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(ld.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual Fleet Lead Intake Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Single Fleet Lead to Pool"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Fleet Transport"
                value={manualFormData.companyName}
                onChange={(e) => setManualFormData({ ...manualFormData, companyName: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Units (NOU)</label>
              <input
                type="number"
                placeholder="e.g. 24"
                value={manualFormData.numberOfUnits}
                onChange={(e) => setManualFormData({ ...manualFormData, numberOfUnits: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fleet Manager</label>
              <input
                type="text"
                placeholder="e.g. Marcus Vance"
                value={manualFormData.fleetManager}
                onChange={(e) => setManualFormData({ ...manualFormData, fleetManager: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CEO / Owner Name</label>
              <input
                type="text"
                placeholder="e.g. Robert Vance"
                value={manualFormData.ceoOwnerName}
                onChange={(e) => setManualFormData({ ...manualFormData, ceoOwnerName: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Contact Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. +14165550111"
                value={manualFormData.phone}
                onChange={(e) => setManualFormData({ ...manualFormData, phone: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alternative Contact No</label>
              <input
                type="tel"
                placeholder="e.g. +14165550199"
                value={manualFormData.altPhone}
                onChange={(e) => setManualFormData({ ...manualFormData, altPhone: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                placeholder="e.g. marcus@apexfleet.com"
                value={manualFormData.email}
                onChange={(e) => setManualFormData({ ...manualFormData, email: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">POA : Email (Billing / Decision Maker)</label>
              <input
                type="email"
                placeholder="e.g. invoices@apexfleet.com"
                value={manualFormData.poaEmail}
                onChange={(e) => setManualFormData({ ...manualFormData, poaEmail: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Address</label>
              <input
                type="text"
                placeholder="e.g. 100 King St W, Toronto, ON"
                value={manualFormData.companyAddress}
                onChange={(e) => setManualFormData({ ...manualFormData, companyAddress: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
              <input
                type="url"
                placeholder="e.g. https://apexfleet.com"
                value={manualFormData.website}
                onChange={(e) => setManualFormData({ ...manualFormData, website: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Fleet Requirements</label>
              <textarea
                rows={2}
                placeholder="e.g. Commercial 24/7 coverage for long-haul rigs, tire specs 11R22.5"
                value={manualFormData.notes}
                onChange={(e) => setManualFormData({ ...manualFormData, notes: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLeadMutation.isPending}
              className="btn-primary text-xs px-5 py-2 font-bold cursor-pointer"
            >
              {createLeadMutation.isPending ? 'Saving Lead...' : 'Push to Pool'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
