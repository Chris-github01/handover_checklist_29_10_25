import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Variation {
  id?: string;
  description: string;
  value: number;
  claimed_amount: number;
  order_index: number;
}

interface CostAllocationModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function CostAllocationModal({ projectId, projectName, onClose }: CostAllocationModalProps) {
  const [agreedContractValue, setAgreedContractValue] = useState<number>(0);
  const [contractWorksClaimed, setContractWorksClaimed] = useState<number>(0);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      if (variationsData && variationsData.length > 0) {
        setVariations(variationsData.map(v => ({
          id: v.id,
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

  const addVariation = () => {
    const newVariation: Variation = {
      description: '',
      value: 0,
      claimed_amount: 0,
      order_index: variations.length
    };
    setVariations([...variations, newVariation]);
  };

  const updateVariation = (index: number, field: keyof Variation, value: string | number) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  };

  const removeVariation = (index: number) => {
    const updated = variations.filter((_, i) => i !== index);
    const reindexed = updated.map((v, i) => ({ ...v, order_index: i }));
    setVariations(reindexed);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error: costError } = await supabase
        .from('project_costs')
        .upsert({
          project_id: projectId,
          agreed_contract_value: agreedContractValue,
          contract_works_claimed: contractWorksClaimed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        });

      if (costError) throw costError;

      const { error: deleteError } = await supabase
        .from('project_variations')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      if (variations.length > 0) {
        const variationsToInsert = variations.map(v => ({
          project_id: projectId,
          description: v.description,
          value: v.value,
          claimed_amount: v.claimed_amount,
          order_index: v.order_index
        }));

        const { error: insertError } = await supabase
          .from('project_variations')
          .insert(variationsToInsert);

        if (insertError) throw insertError;
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalVariationsValue = variations.reduce((sum, v) => sum + v.value, 0);
  const totalVariationsClaimed = variations.reduce((sum, v) => sum + v.claimed_amount, 0);
  const contractWorksOutstanding = agreedContractValue - contractWorksClaimed;
  const variationsOutstanding = totalVariationsValue - totalVariationsClaimed;
  const contractWorksPercent = agreedContractValue > 0 ? (contractWorksClaimed / agreedContractValue) * 100 : 0;

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
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cost Allocation</h2>
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

          <div className="bg-blue-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Contract Works</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agreed Contract Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={agreedContractValue}
                    onChange={(e) => setAgreedContractValue(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Works Claimed to Date
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={contractWorksClaimed}
                    onChange={(e) => setContractWorksClaimed(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Outstanding to Claim:</span>
                <span className="font-semibold">${contractWorksOutstanding.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Percentage Complete:</span>
                <span className="font-semibold">{contractWorksPercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Variations</h3>
              <button
                onClick={addVariation}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Variation
              </button>
            </div>

            {variations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No variations added yet</p>
            ) : (
              <div className="space-y-3">
                {variations.map((variation, index) => {
                  const varOutstanding = variation.value - variation.claimed_amount;
                  const varPercent = variation.value > 0 ? (variation.claimed_amount / variation.value) * 100 : 0;

                  return (
                    <div key={index} className="bg-white rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={variation.description}
                            onChange={(e) => updateVariation(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Variation description"
                          />
                        </div>
                        <button
                          onClick={() => removeVariation(index)}
                          className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Variation Value
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={variation.value}
                              onChange={(e) => updateVariation(index, 'value', Number(e.target.value))}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Claimed to Date
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={variation.claimed_amount}
                              onChange={(e) => updateVariation(index, 'claimed_amount', Number(e.target.value))}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded p-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Outstanding:</span>
                          <span className="font-medium">${varOutstanding.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Complete:</span>
                          <span className="font-medium">{varPercent.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {variations.length > 0 && (
              <div className="bg-white rounded p-3 space-y-2 border-2 border-green-600">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Variations Value:</span>
                  <span className="font-semibold">${totalVariationsValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Variations Claimed:</span>
                  <span className="font-semibold">${totalVariationsClaimed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Outstanding to Claim:</span>
                  <span className="font-semibold">${variationsOutstanding.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-600">
            <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Project Value:</span>
                <span className="font-semibold">${(agreedContractValue + totalVariationsValue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Claimed to Date:</span>
                <span className="font-semibold text-green-700">${(contractWorksClaimed + totalVariationsClaimed).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Outstanding:</span>
                <span className="font-semibold text-orange-700">${(contractWorksOutstanding + variationsOutstanding).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Cost Allocation'}
          </button>
        </div>
      </div>
    </div>
  );
}
