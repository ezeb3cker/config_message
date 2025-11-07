import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { read, utils } from 'xlsx';
import { toast } from 'sonner@2.0.3';

interface FileUploadProps {
  onFileSelected: (file: File | null) => void;
  onSpreadsheetDataExtracted: (data: any[]) => void;
  uploadedFile: File | null;
}

export function FileUpload({ onFileSelected, onSpreadsheetDataExtracted, uploadedFile }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado interno quando uploadedFile é resetado
  useEffect(() => {
    if (uploadedFile === null) {
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [uploadedFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv' && fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast.error('Por favor, selecione um arquivo CSV ou XLSX válido');
      return;
    }

    setFile(selectedFile);
    onFileSelected(selectedFile);
    setLoading(true);

    try {
      // Ler o arquivo
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(firstSheet);

      // Validar se o arquivo possui as colunas obrigatórias
      if (data.length === 0) {
        toast.error('O arquivo está vazio. Por favor, selecione um arquivo com dados.');
        setFile(null);
        onFileSelected(null);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      // Verificar se as colunas "categoria" e "telefone" (ou "número") existem
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      
      // Normalizar colunas removendo espaços, acentos, pontos e convertendo para minúsculo
      const normalizeColumn = (col: string) => {
        return col
          .toLowerCase()
          .trim()
          .replace(/:/g, '') // Remove dois pontos
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      };
      
      const normalizedColumns = columns.map(normalizeColumn);
      
      console.log('Colunas detectadas:', columns);
      console.log('Colunas normalizadas:', normalizedColumns);
      
      const hasCategoria = normalizedColumns.includes('categoria');
      const hasNumero = normalizedColumns.includes('numero');
      const hasTelefone = normalizedColumns.includes('telefone');
      const hasCelular = normalizedColumns.includes('celular');
      
      // Aceita se tiver categoria E (número OU telefone OU celular)
      const hasContactColumn = hasNumero || hasTelefone || hasCelular;

      if (!hasCategoria || !hasContactColumn) {
        const missingColumns = [];
        if (!hasCategoria) missingColumns.push('categoria');
        if (!hasContactColumn) missingColumns.push('número/telefone/celular');
        
        toast.error(
          `O arquivo não possui ${missingColumns.length === 1 ? 'a coluna obrigatória' : 'as colunas obrigatórias'}: ${missingColumns.join(', ')}. ` +
          'Certifique-se de que a primeira linha do arquivo contém essas colunas.'
        );
        
        setFile(null);
        onFileSelected(null);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      // Passar os dados extraídos da planilha para o componente pai
      onSpreadsheetDataExtracted(data);
      
      toast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
      setFile(null);
      onFileSelected(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 flex flex-col items-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 mb-1 shadow-lg">
          <Upload className="w-4 h-4 text-white" />
        </div>
        <p className="text-slate-600 text-sm">
          Selecione um arquivo CSV ou XLSX
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 bg-white/50 hover:border-slate-500 hover:bg-white transition-all">
          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
              className="w-full cursor-pointer text-sm file:text-slate-700 file:font-medium"
            />
            {loading && (
              <div className="flex items-center justify-center gap-2 text-slate-700 bg-slate-100 rounded-lg p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Processando...</span>
              </div>
            )}
            {file && !loading && (
              <div className="flex items-center justify-center gap-2 text-slate-700 bg-green-50 border border-green-200 rounded-lg p-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium">{file.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
