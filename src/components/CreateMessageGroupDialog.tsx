import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { decodeUnicode } from './utils/decodeUnicode';

interface Message {
  id: number;
  categoria: string;
  conteudo: string;
  midiaExtension?: string;
  midiaBase64?: string;
}

interface MessageGroup {
  disparo_id: number;
  mensagens: Message[];
}

interface CreateMessageGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxDisparoId: number;
  onCreate: (newGroup: MessageGroup) => void;
}

const CATEGORIAS_PREDEFINIDAS = [
  'Associado',
  'Cliente',
  'Estudante',
  'Fornecedor',
  'Visitante',
  'Funcionário'
];

export function CreateMessageGroupDialog({ 
  open, 
  onOpenChange, 
  maxDisparoId, 
  onCreate 
}: CreateMessageGroupDialogProps) {
  const [mensagens, setMensagens] = useState<Record<string, string>>(
    CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
  );
  const [midias, setMidias] = useState<Record<string, { extension: string; base64: string } | null>>(
    CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: null }), {})
  );
  const [creating, setCreating] = useState(false);
  const [isGeneral, setIsGeneral] = useState(false);

  const updateConteudo = (categoria: string, value: string) => {
    // Decodificar unicode ao atualizar o conteúdo
    setMensagens(prev => ({
      ...prev,
      [categoria]: decodeUnicode(value)
    }));
  };

  const handleFileUpload = async (categoria: string, file: File) => {
    // Validar tipo de arquivo (imagens, vídeos, PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use imagens, vídeos MP4 ou PDF.');
      return;
    }

    // Limitar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O tamanho máximo é 10MB.');
      return;
    }

    try {
      // Converter para base64
      const base64 = await fileToBase64(file);
      
      // Obter extensão
      const extension = '.' + file.name.split('.').pop();

      setMidias(prev => ({
        ...prev,
        [categoria]: { extension, base64 }
      }));

      toast.success('Mídia anexada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
    }
  };

  const removeMedia = (categoria: string) => {
    setMidias(prev => ({
      ...prev,
      [categoria]: null
    }));
    toast.success('Mídia removida com sucesso!');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo data:...;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleCreate = async () => {
    // Validar se pelo menos uma mensagem foi preenchida
    const hasContent = isGeneral 
      ? mensagens['Geral']?.trim() !== ''
      : Object.values(mensagens).some(content => content.trim() !== '');
    
    if (!hasContent) {
      toast.error('Preencha pelo menos uma mensagem para criar o grupo');
      return;
    }

    setCreating(true);

    try {
      const novoDisparoId = maxDisparoId + 1;
      
      // Criar array de mensagens
      let mensagensArray: Message[];
      
      if (isGeneral) {
        // Se for mensagem geral, criar apenas uma mensagem com categoria "Geral"
        mensagensArray = [{
          id: (maxDisparoId * 10) + 1,
          categoria: 'Geral',
          conteudo: mensagens['Geral'] || '',
          midiaExtension: midias['Geral']?.extension,
          midiaBase64: midias['Geral']?.base64
        }];
      } else {
        // Criar array de mensagens apenas com as que têm conteúdo
        mensagensArray = CATEGORIAS_PREDEFINIDAS
          .map((categoria, index) => ({
            id: (maxDisparoId * 10) + index + 1, // Gerar IDs únicos baseados no disparo_id
            categoria,
            conteudo: mensagens[categoria],
            midiaExtension: midias[categoria]?.extension,
            midiaBase64: midias[categoria]?.base64
          }))
          .filter(msg => msg.conteudo.trim() !== '');
      }

      const novoGrupo: MessageGroup = {
        disparo_id: novoDisparoId,
        mensagens: mensagensArray
      };

      // Formatar mensagens para o formato da API
      const formattedMessages = mensagensArray.map(msg => ({
        id: msg.id,
        categoria: msg.categoria,
        midiaExtension: msg.midiaExtension || null,
        midiaBase64: msg.midiaBase64 || null,
        messageText: msg.conteudo
      }));

      const dataToSend = {
        disparo_id: novoDisparoId,
        mensagens: formattedMessages
      };

      // Enviar para o webhook
      const response = await fetch('https://dev.gruponfa.com/webhook/860274ef-1be7-44f0-8135-bb69f70265ce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar grupo de mensagens');
      }

      // Verificar se há conteúdo antes de fazer parse
      const text = await response.text();
      let result = null;
      
      if (text && text.trim() !== '') {
        try {
          result = JSON.parse(text);
        } catch (parseError) {
          console.warn('Resposta não é JSON válido, continuando...', parseError);
        }
      }
      
      // Verificar se a API retornou success (se houver resposta)
      // Ou aceitar resposta vazia como sucesso
      if (!result || (result && Array.isArray(result) && result[0]?.success) || response.status === 200) {
        onCreate(novoGrupo);
        toast.success('Grupo de mensagens criado com sucesso!');
        
        // Limpar formulário
        setMensagens(
          CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
        );
        setMidias(
          CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: null }), {})
        );
        setIsGeneral(false);
        
        onOpenChange(false);
      } else {
        throw new Error('Resposta inesperada da API');
      }
    } catch (error) {
      console.error('Erro ao criar grupo de mensagens:', error);
      toast.error('Erro ao criar grupo de mensagens. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    // Limpar formulário ao cancelar
    setMensagens(
      CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
    );
    setMidias(
      CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: null }), {})
    );
    setIsGeneral(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        {/* Loading Overlay */}
        {creating && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
            <p className="text-white">Criando grupo de mensagens...</p>
            <p className="text-sm text-white/80 mt-2">Aguarde enquanto processamos sua solicitação</p>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Criar Grupo de Mensagens</DialogTitle>
          <DialogDescription>
            {isGeneral 
              ? 'A mensagem geral será disparada para todas as categorias.'
              : 'Preencha o conteúdo para cada categoria. Deixe em branco as categorias que não deseja incluir.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Switch para mensagem geral */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div className="space-y-0.5">
            <Label htmlFor="general-mode" className="text-slate-900">
              Disparar para todas as categorias?
            </Label>
            <p className="text-sm text-slate-600">
              Ative para enviar a mesma mensagem para todas as categorias
            </p>
          </div>
          <Switch
            id="general-mode"
            checked={isGeneral}
            onCheckedChange={(checked) => {
              setIsGeneral(checked);
              // Limpar mensagens ao alternar
              if (checked) {
                setMensagens({ 'Geral': '' });
                setMidias({ 'Geral': null });
              } else {
                setMensagens(
                  CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
                );
                setMidias(
                  CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: null }), {})
                );
              }
            }}
          />
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {isGeneral ? (
              // Campo único para mensagem geral
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <h4 className="text-slate-900">Mensagem Geral</h4>

                {/* Upload de Mídia */}
                <div className="space-y-2">
                  <Label className="text-slate-900">Mídia (opcional)</Label>
                  {midias['Geral'] ? (
                    <div className="relative border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-700">
                          Arquivo anexado: {midias['Geral']!.extension}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia('Geral')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Preview da mídia */}
                      {midias['Geral']!.extension.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                        <img
                          src={`data:image/${midias['Geral']!.extension.substring(1)};base64,${midias['Geral']!.base64}`}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 rounded"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/mp4,application/pdf';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload('Geral', file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Anexar Mídia
                      </Button>
                      <span className="text-sm text-slate-600">
                        Imagens, vídeos ou PDF (máx. 10MB)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo-geral" className="text-slate-900">Conteúdo</Label>
                  <Textarea
                    id="conteudo-geral"
                    value={mensagens['Geral'] || ''}
                    onChange={(e) => updateConteudo('Geral', e.target.value)}
                    placeholder="Digite o conteúdo da mensagem que será enviada para todas as categorias"
                    className="min-h-[150px] text-slate-900"
                  />
                </div>
              </div>
            ) : (
              // Campos para cada categoria
              CATEGORIAS_PREDEFINIDAS.map((categoria) => (
              <div key={categoria} className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <h4 className="text-slate-900">Categoria {categoria}</h4>

                {/* Upload de Mídia */}
                <div className="space-y-2">
                  <Label className="text-slate-900">Mídia (opcional)</Label>
                  {midias[categoria] ? (
                    <div className="relative border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-700">
                          Arquivo anexado: {midias[categoria]!.extension}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(categoria)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Preview da mídia */}
                      {midias[categoria]!.extension.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                        <img
                          src={`data:image/${midias[categoria]!.extension.substring(1)};base64,${midias[categoria]!.base64}`}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 rounded"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/mp4,application/pdf';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(categoria, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Anexar Mídia
                      </Button>
                      <span className="text-sm text-slate-600">
                        Imagens, vídeos ou PDF (máx. 10MB)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`conteudo-${categoria}`} className="text-slate-900">Conteúdo</Label>
                  <Textarea
                    id={`conteudo-${categoria}`}
                    value={mensagens[categoria]}
                    onChange={(e) => updateConteudo(categoria, e.target.value)}
                    placeholder={`Digite o conteúdo da mensagem para ${categoria}`}
                    className="min-h-[100px] text-slate-900"
                  />
                </div>
              </div>
            ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={creating}
            className="transition-all hover:scale-105 active:scale-95"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="transition-all hover:scale-105 active:scale-95"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
