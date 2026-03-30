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
      // Get all stages and extract unique titles
      const { data: allStages, error } = await supabase
        .from('stages')
        .select('title, order_index');

      if (error) throw error;

      // Get unique stages by title
      const uniqueStages = allStages?.reduce((acc, stage) => {
        if (!acc.find(s => s.title === stage.title)) {
          acc.push({
            id: stage.title, // Use title as ID for selection
            title: stage.title,
            order_index: stage.order_index
          });
        }
        return acc;
      }, [] as Stage[]) || [];

      setStages(uniqueStages.sort((a, b) => a.order_index - b.order_index));
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

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CREATION TEMPLATE', 105, 20, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let yPos = 40;

    doc.text('Project Name:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Client Name:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Project Code:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional - Auto-generated if left blank)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Type:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Passive Fire', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Intumescent', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Passive & Intumescent', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Region:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Auckland', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Wellington', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('BWOF (Building Warrant of Fitness):', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Yes (Skips stages 1-3)', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('No', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Target Start Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(65, yPos, 120, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Format: YYYY-MM-DD)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Status:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Await Pre-let (Verbal confirmation)', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Awarded', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('In Progress', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Active', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Site Manager (SM):', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(65, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('QS (Quantity Surveyor):', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(75, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional)', 22, yPos);
    yPos += 15;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('- All fields marked as required must be filled', 22, yPos);
    yPos += 5;
    doc.text('- Project Code will be auto-generated if left blank', 22, yPos);
    yPos += 5;
    doc.text('- Project Title is auto-generated from: Project Name, Client Name, and Project Code', 22, yPos);
    yPos += 5;
    doc.text('- BWOF projects skip stages 1-3 in the handover process', 22, yPos);
    yPos += 10;

    if (selectedStages.size > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEMS TO BE COMPLETED', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const selectedStagesList = stages.filter(stage => selectedStages.has(stage.id));

      selectedStagesList.forEach((stage) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const stepNumber = stage.title.match(/Step (\d+):/)?.[1] || '';
        const stepTitle = stage.title.replace(/Step \d+:\s*/, '');

        doc.text(`${stepNumber}. ${stepTitle}`, 25, yPos);
        yPos += 8;
      });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`Project_Template_${timestamp}.pdf`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#F4B223] from-brp-primary to-[#E5A520] to-brp-primaryHover px-6 py-4 flex items-center justify-between">
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
              <div className="w-8 h-8 border-4 border-[#F4B223] border-brp-primary border-t-transparent rounded-full animate-spin" />
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
                    className="w-5 h-5 text-[#F4B223] text-brp-primary border-gray-300 rounded focus:ring-2 focus:ring-[#F4B223] focus:ring-brp-primary"
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
              className="px-4 py-2 bg-[#F4B223] bg-brp-primary hover:bg-[#E5A520] hover:bg-brp-primaryHover text-white rounded-lg transition-colors flex items-center space-x-2"
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
