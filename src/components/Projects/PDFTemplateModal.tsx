import React, { useState, useEffect } from 'react';
import { X, FileDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

interface Stage {
  id: string;
  title: string;
  order_index: number;
}

interface PDFTemplateModalProps {
  onClose: () => void;
}

const PDFTemplateModal: React.FC<PDFTemplateModalProps> = ({ onClose }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('id, title, order_index')
        .is('project_id', null)
        .order('order_index');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId: string) => {
    const newSelected = new Set(selectedStages);
    if (newSelected.has(stageId)) {
      newSelected.delete(stageId);
    } else {
      newSelected.add(stageId);
    }
    setSelectedStages(newSelected);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CREATION TEMPLATE', 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Project Name: _________________________________', 20, yPosition);
    yPosition += 10;
    doc.text('Client Name: __________________________________', 20, yPosition);
    yPosition += 10;
    doc.text('Target Start Date: _____________________________', 20, yPosition);
    yPosition += 10;
    doc.text('BWOF: ☐ Yes   ☐ No', 20, yPosition);
    yPosition += 15;

    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    if (selectedStages.size > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEMS TO BE COMPLETED', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const selectedStagesList = stages.filter(stage => selectedStages.has(stage.id));

      selectedStagesList.forEach((stage, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const stepNumber = stage.title.match(/Step (\d+):/)?.[1] || (index + 1);
        const stepTitle = stage.title.replace(/Step \d+:\s*/, '');

        doc.text(`${stepNumber}. ${stepTitle}`, 25, yPosition);
        yPosition += 8;
      });
    }

    doc.save('Project_Template.pdf');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Project PDF Template</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 mb-4">
            Select the steps you want to include as "Items to be completed" in the PDF template:
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage) => (
                <label
                  key={stage.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedStages.has(stage.id)}
                    onChange={() => toggleStage(stage.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 flex-1">{stage.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedStages.size} step{selectedStages.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <FileDown className="w-5 h-5" />
              <span>Generate PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFTemplateModal;
