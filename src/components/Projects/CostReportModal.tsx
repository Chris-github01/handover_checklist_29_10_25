import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

interface Variation {
  id: string;
  item_number?: string;
  description: string;
  value: number;
  claimed_amount: number;
  order_index: number;
}

interface CostReportModalProps {
  projectId: string;
  projectName: string;
  projectCode?: string;
  client: string;
  onClose: () => void;
}

export function CostReportModal({ projectId, projectName, projectCode, client, onClose }: CostReportModalProps) {
  const [agreedContractValue, setAgreedContractValue] = useState<number>(0);
  const [contractWorksClaimed, setContractWorksClaimed] = useState<number>(0);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCostData();
  }, [projectId]);

  const loadCostData = async () => {
    try {
      setLoading(true);

      const { data: costData, error: costError } = await supabase
        .from('project_costs')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (costError) throw costError;

      if (costData) {
        setAgreedContractValue(Number(costData.agreed_contract_value));
        setContractWorksClaimed(Number(costData.contract_works_claimed));
      }

      const { data: variationsData, error: variationsError } = await supabase
        .from('project_variations')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (variationsError) throw variationsError;

      if (variationsData) {
        setVariations(variationsData.map(v => ({
          id: v.id,
          item_number: v.item_number,
          description: v.description,
          value: Number(v.value),
          claimed_amount: Number(v.claimed_amount),
          order_index: v.order_index
        })));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('COST REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Project: ${projectName}`, 15, yPos);
      yPos += 5;
      if (projectCode) {
        doc.text(`Project Code: ${projectCode}`, 15, yPos);
        yPos += 5;
      }
      doc.text(`Client: ${client}`, 15, yPos);
      yPos += 5;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPos);
      yPos += 8;

      doc.setDrawColor(0, 0, 0);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 6;

      const contractWorksOutstanding = agreedContractValue - contractWorksClaimed;
      const contractWorksPercent = agreedContractValue > 0 ? (contractWorksClaimed / agreedContractValue) * 100 : 0;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT WORKS', 15, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const contractData = [
        ['Total Value:', `$${agreedContractValue.toFixed(2)}`],
        ['Claimed to Date:', `$${contractWorksClaimed.toFixed(2)} (${contractWorksPercent.toFixed(2)}%)`],
        ['Outstanding:', `$${contractWorksOutstanding.toFixed(2)} (${(100 - contractWorksPercent).toFixed(2)}%)`]
      ];

      contractData.forEach(([label, value]) => {
        doc.text(label, 20, yPos);
        doc.text(value, pageWidth - 20, yPos, { align: 'right' });
        yPos += 5;
      });

      yPos += 6;
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('VARIATIONS', 15, yPos);
      yPos += 6;

      if (variations.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('No variations recorded', 20, yPos);
        yPos += 6;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        variations.forEach((variation, index) => {
          const varOutstanding = variation.value - variation.claimed_amount;
          const varPercent = variation.value > 0 ? (variation.claimed_amount / variation.value) * 100 : 0;

          if (yPos > 270) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFont('helvetica', 'bold');
          doc.text(`Variation ${variation.item_number || (index + 1)}`, 20, yPos);
          yPos += 5;

          doc.setFont('helvetica', 'normal');
          if (variation.description) {
            doc.text(`Description: ${variation.description}`, 25, yPos);
            yPos += 5;
          }

          const varData = [
            ['Value:', `$${variation.value.toFixed(2)}`],
            ['Claimed to Date:', `$${variation.claimed_amount.toFixed(2)} (${varPercent.toFixed(2)}%)`],
            ['Outstanding:', `$${varOutstanding.toFixed(2)} (${(100 - varPercent).toFixed(2)}%)`]
          ];

          varData.forEach(([label, value]) => {
            doc.text(label, 25, yPos);
            doc.text(value, pageWidth - 20, yPos, { align: 'right' });
            yPos += 5;
          });

          yPos += 3;
        });

        yPos += 4;

        const totalVariationsValue = variations.reduce((sum, v) => sum + v.value, 0);
        const totalVariationsClaimed = variations.reduce((sum, v) => sum + v.claimed_amount, 0);
        const variationsOutstanding = totalVariationsValue - totalVariationsClaimed;
        const variationsPercent = totalVariationsValue > 0 ? (totalVariationsClaimed / totalVariationsValue) * 100 : 0;

        doc.setDrawColor(100, 100, 100);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'bold');
        const totalVarData = [
          ['Total Variations Value:', `$${totalVariationsValue.toFixed(2)}`],
          ['Total Claimed to Date:', `$${totalVariationsClaimed.toFixed(2)} (${variationsPercent.toFixed(2)}%)`],
          ['Total Outstanding:', `$${variationsOutstanding.toFixed(2)} (${(100 - variationsPercent).toFixed(2)}%)`]
        ];

        totalVarData.forEach(([label, value]) => {
          doc.text(label, 20, yPos);
          doc.text(value, pageWidth - 20, yPos, { align: 'right' });
          yPos += 5;
        });
      }

      yPos += 6;
      doc.setDrawColor(0, 0, 0);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 6;

      const totalVariationsValue = variations.reduce((sum, v) => sum + v.value, 0);
      const totalVariationsClaimed = variations.reduce((sum, v) => sum + v.claimed_amount, 0);
      const totalProjectValue = agreedContractValue + totalVariationsValue;
      const totalClaimedToDate = contractWorksClaimed + totalVariationsClaimed;
      const totalOutstanding = totalProjectValue - totalClaimedToDate;
      const totalPercent = totalProjectValue > 0 ? (totalClaimedToDate / totalProjectValue) * 100 : 0;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT SUMMARY', 15, yPos);
      yPos += 6;

      doc.setFontSize(10);
      const summaryData = [
        ['Total Project Value:', `$${totalProjectValue.toFixed(2)}`],
        ['Total Claimed to Date:', `$${totalClaimedToDate.toFixed(2)} (${totalPercent.toFixed(2)}%)`],
        ['Total Outstanding:', `$${totalOutstanding.toFixed(2)} (${(100 - totalPercent).toFixed(2)}%)`]
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(label, 20, yPos);
        doc.text(value, pageWidth - 20, yPos, { align: 'right' });
        yPos += 6;
      });

      const fileName = `Cost_Report_${projectCode || projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const totalVariationsValue = variations.reduce((sum, v) => sum + v.value, 0);
  const totalVariationsClaimed = variations.reduce((sum, v) => sum + v.claimed_amount, 0);
  const contractWorksOutstanding = agreedContractValue - contractWorksClaimed;
  const variationsOutstanding = totalVariationsValue - totalVariationsClaimed;
  const contractWorksPercent = agreedContractValue > 0 ? (contractWorksClaimed / agreedContractValue) * 100 : 0;
  const variationsPercent = totalVariationsValue > 0 ? (totalVariationsClaimed / totalVariationsValue) * 100 : 0;
  const totalProjectValue = agreedContractValue + totalVariationsValue;
  const totalClaimedToDate = contractWorksClaimed + totalVariationsClaimed;
  const totalOutstanding = totalProjectValue - totalClaimedToDate;
  const totalPercent = totalProjectValue > 0 ? (totalClaimedToDate / totalProjectValue) * 100 : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading cost data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cost Report Preview</h2>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Project:</span>
                <p className="font-medium">{projectName}</p>
              </div>
              {projectCode && (
                <div>
                  <span className="text-gray-600">Project Code:</span>
                  <p className="font-medium">{projectCode}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium">{client}</p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Contract Works</h3>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Value:</span>
                <span className="font-semibold">${agreedContractValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Claimed to Date:</span>
                <span className="font-semibold">${contractWorksClaimed.toFixed(2)} ({contractWorksPercent.toFixed(2)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Outstanding:</span>
                <span className="font-semibold">${contractWorksOutstanding.toFixed(2)} ({(100 - contractWorksPercent).toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Variations</h3>
            {variations.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No variations recorded</p>
            ) : (
              <div className="space-y-3">
                {variations.map((variation, index) => {
                  const varOutstanding = variation.value - variation.claimed_amount;
                  const varPercent = variation.value > 0 ? (variation.claimed_amount / variation.value) * 100 : 0;

                  return (
                    <div key={variation.id} className="bg-green-50 rounded-lg p-4">
                      <p className="font-semibold text-sm mb-2">Variation {variation.item_number || (index + 1)}</p>
                      {variation.description && (
                        <p className="text-sm text-gray-700 mb-2">{variation.description}</p>
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Value:</span>
                          <span className="font-medium">${variation.value.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Claimed to Date:</span>
                          <span className="font-medium">${variation.claimed_amount.toFixed(2)} ({varPercent.toFixed(2)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Outstanding:</span>
                          <span className="font-medium">${varOutstanding.toFixed(2)} ({(100 - varPercent).toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-green-100 rounded-lg p-4 border-2 border-green-600">
                  <p className="font-semibold text-sm mb-2">Total Variations</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Value:</span>
                      <span className="font-semibold">${totalVariationsValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Claimed to Date:</span>
                      <span className="font-semibold">${totalVariationsClaimed.toFixed(2)} ({variationsPercent.toFixed(2)}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Outstanding:</span>
                      <span className="font-semibold">${variationsOutstanding.toFixed(2)} ({(100 - variationsPercent).toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t-2 border-gray-300 pt-4">
            <h3 className="font-semibold text-lg mb-3">Project Summary</h3>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-600">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Total Project Value:</span>
                  <span className="font-bold text-lg">${totalProjectValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Total Claimed to Date:</span>
                  <span className="font-bold text-lg text-green-700">${totalClaimedToDate.toFixed(2)} ({totalPercent.toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Total Outstanding:</span>
                  <span className="font-bold text-lg text-orange-700">${totalOutstanding.toFixed(2)} ({(100 - totalPercent).toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={generating}
          >
            Close
          </button>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
