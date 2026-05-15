/**
 * QueryPointsModal â€” Nokta Sorgulama ve Listeleme
 *
 * PrimeReact DataTable + client-side filtreleme (gÃ¼venilir, kontrollÃ¼).
 * Dropdown overlay'leri document.body'ye render edilir (MUI Dialog uyumu).
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  IconButton, Typography, Box, Chip, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableViewIcon from '@mui/icons-material/TableView';

import { DataTable } from 'primereact/datatable';
import { Column }    from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown }  from 'primereact/dropdown';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './QueryPointsModal.css';

import { listMapPoints } from '../api/mapPoints';
import { fetchCategories } from '../api/categories';
import { exportPointsGeoJSON, exportPointsCSV } from '../utils/pointExport';

const OVERLAY_TARGET = typeof document !== 'undefined' ? document.body : null;

// â”€â”€ YardÄ±mcÄ±lar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtCoord = (v) => (typeof v === 'number' ? v.toFixed(6) : 'â€”');
const fmtMercator = (v) => (typeof v === 'number' ? v.toFixed(2) : 'â€”');
const fmtDate  = (iso) => {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function normalizePoint(raw) {
  if (!raw) return raw;
  return {
    id: raw.id ?? raw.Id,
    name: raw.name ?? raw.Name ?? '',
    number: String(raw.number ?? raw.Number ?? ''),
    category: raw.category ?? raw.Category ?? '',
    latitude: raw.latitude ?? raw.Latitude,
    longitude: raw.longitude ?? raw.Longitude,
    xMercator: raw.xMercator ?? raw.XMercator,
    yMercator: raw.yMercator ?? raw.YMercator,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    description: raw.description ?? raw.Description,
    createdByUserId: raw.createdByUserId ?? raw.CreatedByUserId,
  };
}

function filterPoints(rows, { name, number, category }) {
  const nameQ = name.trim().toLowerCase();
  const numQ  = number.trim();

  return rows.filter((row) => {
    if (nameQ && !row.name.toLowerCase().includes(nameQ)) return false;
    if (numQ && !row.number.includes(numQ)) return false;
    if (category && row.category !== category) return false;
    return true;
  });
}

// â”€â”€ BileÅŸen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function QueryPointsModal({
  open,
  onClose,
  onPointSelect,
  initialPoints = null,
  title = 'Nokta Sorgulama',
  resultHint = null,
}) {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exportMsg, setExportMsg] = useState(null);

  // Filtre state
  const [nameFilter, setNameFilter]         = useState('');
  const [numberFilter, setNumberFilter]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({
      label: c.displayName ?? c.name,
      value: c.name,
    })),
    [categories],
  );

  const filteredRows = useMemo(
    () => filterPoints(rows, { name: nameFilter, number: numberFilter, category: categoryFilter }),
    [rows, nameFilter, numberFilter, categoryFilter],
  );

  const hasActiveFilters = Boolean(
    nameFilter.trim() || numberFilter.trim() || categoryFilter,
  );

  // â”€â”€ Veri yÃ¼kleme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!open) return;
    let alive = true;

    setLoading(true);
    setSelectedRow(null);
    setExportMsg(null);
    setNameFilter('');
    setNumberFilter('');
    setCategoryFilter(null);

    if (initialPoints) {
      setRows(initialPoints.map(normalizePoint));
      fetchCategories()
        .then((cats) => { if (alive) setCategories(cats ?? []); })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }

    Promise.all([listMapPoints(), fetchCategories()])
      .then(([points, cats]) => {
        if (!alive) return;
        setRows((points ?? []).map(normalizePoint));
        setCategories(cats ?? []);
      })
      .catch((err) => console.error('Noktalar yÃ¼klenemedi:', err))
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [open, initialPoints]);

  const clearFilters = () => {
    setNameFilter('');
    setNumberFilter('');
    setCategoryFilter(null);
  };

  const handleRowClick = ({ data }) => {
    setSelectedRow(data);
    onPointSelect?.(data);
  };

  const runExport = (fn) => {
    setExportMsg(null);
    const result = fn(filteredRows, categories);
    if (!result.ok) setExportMsg(result.message);
    else setExportMsg(`${result.count} kayÄ±t dÄ±ÅŸa aktarÄ±ldÄ±.`);
  };

  const handleExportGeoJSON = () => runExport(exportPointsGeoJSON);
  const handleExportCSV = () => runExport(exportPointsCSV);

  const categoryBody = (row) => {
    const cat = categories.find((c) => c.name === row.category);
    return cat?.displayName ?? row.category ?? 'â€”';
  };

  const latBody  = (row) => fmtCoord(row.latitude);
  const lonBody  = (row) => fmtCoord(row.longitude);
  const xBody    = (row) => fmtMercator(row.xMercator);
  const yBody    = (row) => fmtMercator(row.yMercator);
  const dateBody = (row) => fmtDate(row.createdAt);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      disableScrollLock
      sx={{ zIndex: 1300 }}
      PaperProps={{ sx: { maxHeight: '90vh', borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#37474f',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem', fontWeight: 700 }}>
          {title}
        </Typography>

        {selectedRow && (
          <Chip
            icon={<MyLocationIcon sx={{ fontSize: 16 }} />}
            label={`SeÃ§ili: ${selectedRow.name}`}
            size="small"
            sx={{ bgcolor: '#80cbc4', color: '#004d40', fontWeight: 600 }}
          />
        )}

        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          {/* â”€â”€ Filtre araÃ§ Ã§ubuÄŸu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="qp-filter-bar">
            <div className="qp-filter-field">
              <label htmlFor="qp-name-filter">Ad</label>
              <InputText
                id="qp-name-filter"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Ä°sme gÃ¶re araâ€¦"
              />
            </div>

            <div className="qp-filter-field">
              <label htmlFor="qp-number-filter">Numara</label>
              <InputText
                id="qp-number-filter"
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                placeholder="Numara araâ€¦"
              />
            </div>

            <div className="qp-filter-field">
              <label htmlFor="qp-category-filter">Kategori</label>
              <Dropdown
                inputId="qp-category-filter"
                value={categoryFilter}
                options={categoryOptions}
                onChange={(e) => setCategoryFilter(e.value)}
                placeholder="TÃ¼mÃ¼"
                showClear
                appendTo={OVERLAY_TARGET}
                panelClassName="qp-dropdown-panel"
                className="qp-category-dropdown"
              />
            </div>

            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterAltOffIcon />}
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              sx={{ alignSelf: 'flex-end', mb: '2px', whiteSpace: 'nowrap' }}
            >
              Temizle
            </Button>

            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportGeoJSON}
              disabled={loading || filteredRows.length === 0}
              sx={{ alignSelf: 'flex-end', mb: '2px', whiteSpace: 'nowrap' }}
            >
              GeoJSON
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<TableViewIcon />}
              onClick={handleExportCSV}
              disabled={loading || filteredRows.length === 0}
              sx={{ alignSelf: 'flex-end', mb: '2px', whiteSpace: 'nowrap' }}
            >
              CSV
            </Button>
          </div>

          <Typography variant="caption" sx={{ color: '#607d8b', display: 'block', pb: 0.5 }}>
            {resultHint ?? `${filteredRows.length} / ${rows.length} kayÄ±t`} â€¢ SatÄ±ra tÄ±klayÄ±n â†’ haritada vurgula
            {exportMsg && (
              <Box component="span" sx={{ display: 'block', color: exportMsg.includes('aktarÄ±ldÄ±') ? '#2e7d32' : '#c62828', mt: 0.25 }}>
                {exportMsg}
              </Box>
            )}
          </Typography>

          {/* â”€â”€ DataTable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="qp-wrapper">
            <DataTable
              value={filteredRows}
              dataKey="id"
              loading={loading}
              loadingIcon="pi pi-spin pi-spinner"
              emptyMessage="Filtreye uygun kayÄ±t bulunamadÄ±."
              sortMode="multiple"
              removableSort
              paginator
              paginatorDropdownAppendTo={OVERLAY_TARGET}
              rows={10}
              rowsPerPageOptions={[5, 10, 25, 50]}
              selectionMode="single"
              selection={selectedRow}
              onSelectionChange={(e) => setSelectedRow(e.value)}
              onRowClick={handleRowClick}
              rowHover
              scrollable
              scrollHeight="50vh"
              tableStyle={{ minWidth: '1020px' }}
            >
              <Column field="name"      header="Ad"                  sortable style={{ minWidth: '160px' }} />
              <Column field="number"    header="Numara"              sortable style={{ minWidth: '120px' }} />
              <Column field="category"  header="Kategori" body={categoryBody} sortable style={{ minWidth: '140px' }} />
              <Column field="latitude"  header="Enlem (4326)"  body={latBody}  sortable style={{ minWidth: '120px', fontFamily: 'monospace' }} />
              <Column field="longitude" header="Boylam (4326)" body={lonBody} sortable style={{ minWidth: '120px', fontFamily: 'monospace' }} />
              <Column field="xMercator" header="X (3857)" body={xBody} sortable style={{ minWidth: '110px', fontFamily: 'monospace' }} />
              <Column field="yMercator" header="Y (3857)" body={yBody} sortable style={{ minWidth: '110px', fontFamily: 'monospace' }} />
              <Column field="createdAt" header="OluÅŸturulma Tarihi" body={dateBody} sortable style={{ minWidth: '160px' }} />
            </DataTable>
          </div>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
