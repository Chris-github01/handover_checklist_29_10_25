import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Edit2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

interface ExtractedData {
  contractWorks: {
    description: string;
    value: number;
    claimed: number;
  }[];
  variations: {
    description: string;
    value: number;
    claimed: number;
  }[];
  totalContractValue: number;
  totalContractClaimed: number;
}

interface PDFImportModalProps {
  onClose: () => void;
  onImport: (data: ExtractedData) => void;
}

export function PDFImportModal({ onClose, onImport }: PDFImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const parsePDFText = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const contractWorks: ExtractedData['contractWorks'] = [];
    const variations: ExtractedData['variations'] = [];
    let totalContractValue = 0;
    let totalContractClaimed = 0;
    let inVariationsSection = false;

    const moneyRegex = /\$?\s*([\d,]+\.?\d*)/;
    const percentRegex = /([\d.]+)\s*%/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('BASE CONTRACT') || line.includes('TOTAL BASE CONTRACT')) {
        inVariationsSection = false;
        continue;
      }

      if (line.includes('VARIATION') || line.match(/^2\.\d+/)) {
        inVariationsSection = true;
      }

      const itemMatch = line.match(/^(1\.\d+|2\.\d+[a-z]*)\s+/);
      if (itemMatch) {
        const itemNumber = itemMatch[1];
        let description = '';
        let value = 0;
        let percent = 0;

        const restOfLine = line.substring(itemMatch[0].length);
        const descMatch = restOfLine.match(/^([^$]+)/);
        if (descMatch) {
          description = descMatch[1].trim();
        }

        const moneyMatches = restOfLine.match(/\$\s*([\d,]+\.?\d*)/g);
        if (moneyMatches && moneyMatches.length > 0) {
          const lastMoney = moneyMatches[moneyMatches.length - 1];
          const valueStr = lastMoney.replace(/[$,\s]/g, '');
          value = parseFloat(valueStr) || 0;
        }

        const percentMatch = restOfLine.match(percentRegex);
        if (percentMatch) {
          percent = parseFloat(percentMatch[1]) || 0;
        }

        const claimed = value * (percent / 100);

        if (itemNumber.startsWith('1.') && !inVariationsSection) {
          contractWorks.push({ description, value, claimed });
          totalContractValue += value;
          totalContractClaimed += claimed;
        } else if (itemNumber.startsWith('2.')) {
          if (description && value > 0) {
            variations.push({ description, value, claimed });
          }
        }
      }

      if (line.includes('TOTAL BASE CONTRACT')) {
        const moneyMatches = lines[i + 1]?.match(/\$\s*([\d,]+\.?\d*)/g);
        if (moneyMatches && moneyMatches.length > 0) {
          const totalStr = moneyMatches[0].replace(/[$,\s]/g, '');
          const parsedTotal = parseFloat(totalStr);
          if (parsedTotal > 0) {
            totalContractValue = parsedTotal;
          }
        }
      }
    }

    if (contractWorks.length === 0) {
      contractWorks.push({
        description: 'Contract Works',
        value: totalContractValue,
        claimed: totalContractClaimed
      });
    }

    return {
      contractWorks,
      variations,
      totalContractValue,
      totalContractClaimed
    };
  };

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setError(null);

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      const extracted = parsePDFText(fullText);

      setExtractedData(extracted);
      setEditMode(true);
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      setError(`Failed to extract data from PDF: ${err.message}. Please review and correct manually.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = () => {
    if (extractedData) {
      onImport(extractedData);
    }
  };

  const updateContractWork = (index: number, field: string, value: string | number) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.contractWorks[index] = {
      ...updated.contractWorks[index],
      [field]: field === 'description' ? value : parseFloat(value as string) || 0
    };
    setExtractedData(updated);
  };

  const updateVariation = (index: number, field: string, value: string | number) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.variations[index] = {
      ...updated.variations[index],
      [field]: field === 'description' ? value : parseFloat(value as string) || 0
    };
    setExtractedData(updated);
  };

  const removeVariation = (index: number) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.variations = updated.variations.filter((_, i) => i !== index);
    setExtractedData(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import Cost Data from PDF</h2>
            <p className="text-sm text-gray-600 mt-1">Extract and review cost allocation data</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Semi-Automated Import</p>
              <p>The system will attempt to extract data from your PDF. Please review and correct all extracted values before importing.</p>
            </div>
          </div>

          {!extractedData ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 mb-1">Upload Payment Claim PDF</h3>
                    <p className="text-sm text-gray-600">Select a PDF file to extract cost data</p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <FileText className="w-4 h-4" />
                      Choose PDF File
                    </span>
                  </label>

                  {file && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded">
                      <FileText className="w-4 h-4" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {file && (
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Extract Data from PDF
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Data Extracted Successfully</p>
                  <p>Found {extractedData.contractWorks.length} contract work item(s) and {extractedData.variations.length} variation(s). Please review and correct below.</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Contract Works</h3>
                  {editMode && <Edit2 className="w-4 h-4 text-blue-600" />}
                </div>

                {extractedData.contractWorks.map((item, index) => (
                  <div key={index} className="bg-white rounded p-3 space-y-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateContractWork(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Value</label>
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => updateContractWork(index, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Claimed</label>
                        <input
                          type="number"
                          value={item.claimed}
                          onChange={(e) => updateContractWork(index, 'claimed', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Variations ({extractedData.variations.length})</h3>
                  {editMode && <Edit2 className="w-4 h-4 text-green-600" />}
                </div>

                {extractedData.variations.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No variations found in PDF</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {extractedData.variations.map((variation, index) => (
                      <div key={index} className="bg-white rounded p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-gray-500">Variation {index + 1}</span>
                          <button
                            onClick={() => removeVariation(index)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          value={variation.description}
                          onChange={(e) => updateVariation(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Value</label>
                            <input
                              type="number"
                              value={variation.value}
                              onChange={(e) => updateVariation(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Claimed</label>
                            <input
                              type="number"
                              value={variation.claimed}
                              onChange={(e) => updateVariation(index, 'claimed', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-600">
                <h3 className="font-semibold text-gray-900 mb-3">Preview Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Contract Works:</span>
                    <span className="font-semibold">${extractedData.contractWorks.reduce((sum, item) => sum + item.value, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contract Works Claimed:</span>
                    <span className="font-semibold">${extractedData.contractWorks.reduce((sum, item) => sum + item.claimed, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Variations:</span>
                    <span className="font-semibold">${extractedData.variations.reduce((sum, v) => sum + v.value, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Variations Claimed:</span>
                    <span className="font-semibold">${extractedData.variations.reduce((sum, v) => sum + v.claimed, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {extractedData && (
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Import Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
