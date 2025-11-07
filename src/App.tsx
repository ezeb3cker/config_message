import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { MessageSelector } from './components/MessageSelector';
import { CreateMessageGroupDialog } from './components/CreateMessageGroupDialog';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Send, Loader2, CheckCircle2, Plus, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { decodeUnicode } from './components/utils/decodeUnicode';

export default function App() {
  const [messages, setMessages] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [secondsPerMessage, setSecondsPerMessage] = useState<number>(5);

  // Função para agrupar mensagens por disparo_id e ordenar por id
  const groupMessagesByDisparoId = (flatMessages: any[]) => {
    // Ordenar por id primeiro
    const sortedMessages = [...flatMessages].sort((a, b) => a.id - b.id);
    
    // Agrupar por disparo_id
    const grouped = sortedMessages.reduce((acc, item) => {
      const key = item.disparo_id.toString();
      if (!acc[key]) {
        acc[key] = {
          disparo_id: item.disparo_id,
          mensagens: []
        };
      }

      // Usar o novo formato da API que retorna messageText diretamente
      const rawContent = item.messageText || item.conteudo || '';
      const messageData = {
        conteudo: decodeUnicode(rawContent), // Decodificar emojis unicode
        midiaExtension: item.midiaExtension || undefined,
        midiaBase64: item.midiaBase64 || undefined
      };

      acc[key].mensagens.push({
        id: item.id,
        categoria: item.categoria,
        conteudo: messageData.conteudo,
        midiaExtension: messageData.midiaExtension,
        midiaBase64: messageData.midiaBase64
      });
      return acc;
    }, {} as Record<string, any>);

    // Converter para array e ordenar por disparo_id
    return Object.values(grouped).sort((a, b) => a.disparo_id - b.disparo_id);
  };

  // Carregar mensagens automaticamente ao montar o componente
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingMessages(true);

      try {
        const response = await fetch('https://dev.gruponfa.com/webhook/cvale-busca-mensagem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: [] }), // Enviar array vazio para buscar todas as mensagens
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar mensagens do webhook');
        }

        // Verificar se há conteúdo antes de fazer parse
        const text = await response.text();
        if (!text || text.trim() === '') {
          // Resposta vazia - definir como array vazio
          setMessages([]);
          return;
        }

        try {
          const flatMessages = JSON.parse(text);
          
          // Se a resposta for um array vazio ou não houver mensagens, definir como array vazio
          if (Array.isArray(flatMessages) && flatMessages.length > 0) {
            const groupedMessages = groupMessagesByDisparoId(flatMessages);
            setMessages(groupedMessages);
          } else {
            setMessages([]);
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          setMessages([]);
        }
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        toast.error('Erro ao buscar mensagens.');
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, []);

  const handleUpdateMessage = (updatedGroup: any) => {
    // Atualizar a lista de mensagens com o grupo editado
    if (messages) {
      const updatedMessages = messages.map((group: any) =>
        group.disparo_id === updatedGroup.disparo_id ? updatedGroup : group
      );
      setMessages(updatedMessages);
      
      // Se a mensagem selecionada foi editada, atualizar também
      if (selectedMessage?.disparo_id === updatedGroup.disparo_id) {
        setSelectedMessage(updatedGroup);
      }
    }
  };

  const handleCreateMessage = (newGroup: any) => {
    // Adicionar novo grupo à lista de mensagens
    if (messages) {
      const updatedMessages = [...messages, newGroup];
      setMessages(updatedMessages);
      toast.success('Novo grupo adicionado à lista!');
    }
  };

  const handleDeleteMessage = (deletedGroup: any) => {
    // Remover grupo da lista de mensagens
    if (messages) {
      const updatedMessages = messages.filter((group: any) => 
        group.disparo_id !== deletedGroup.disparo_id
      );
      setMessages(updatedMessages);
      
      // Se a mensagem selecionada foi excluída, desmarcar
      if (selectedMessage?.disparo_id === deletedGroup.disparo_id) {
        setSelectedMessage(null);
      }
      
      toast.success('Grupo de mensagens excluído com sucesso!');
    }
  };

  const handleDispatch = async () => {
    if (!selectedMessage) {
      toast.error('Nenhuma mensagem selecionada para disparar');
      return;
    }

    if (spreadsheetData.length === 0) {
      toast.error('Nenhum dado da planilha foi carregado');
      return;
    }

    setDispatching(true);
    setDispatchSuccess(false);

    try {
      // Enviar os dados da planilha, disparo_id e tempo entre mensagens como JSON
      const payload = {
        disparo_id: selectedMessage.disparo_id,
        data: spreadsheetData,
        secondsPerMessage: secondsPerMessage
      };

      const response = await fetch('https://dev.gruponfa.com/webhook/cda6b77f-ab64-4919-8068-87cd81663149', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar mensagens');
      }

      // Verificar se há conteúdo antes de fazer parse
      const text = await response.text();
      let results = null;
      
      if (text && text.trim() !== '') {
        try {
          results = JSON.parse(text);
        } catch (parseError) {
          console.warn('Resposta não é JSON válido, mas operação foi bem sucedida', parseError);
        }
      }
      
      // Verificar se temos resultados válidos com status e msg
      if (results && Array.isArray(results)) {
        const successCount = results.filter(r => r.status === "202").length;
        
        if (successCount === results.length) {
          toast.success(`Todas as ${successCount} mensagens foram disparadas com sucesso!`);
        } else {
          const failedCount = results.length - successCount;
          toast.warning(`${successCount} mensagens enviadas, ${failedCount} falharam`);
        }
      } else {
        toast.success('Mensagens disparadas com sucesso!');
      }
      
      setDispatchSuccess(true);
      
      // Reiniciar a tela após 3 segundos
      setTimeout(() => {
        setUploadedFile(null);
        setSpreadsheetData([]);
        setSelectedMessage(null);
        setDispatchSuccess(false);
        setSecondsPerMessage(5);
        toast.info('Importe uma nova planilha para continuar');
      }, 3000);
    } catch (error) {
      console.error('Erro ao disparar mensagem:', error);
      toast.error('Erro ao disparar mensagem. Tente novamente.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen p-4 sm:p-6 pb-32 flex items-center justify-center">
        <div className="w-full max-w-4xl">
        {/* Card Principal com Logo e Conteúdo */}
        <Card className="p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border-slate-200/20">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <img 
              src="https://axy7gbdyolcg.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/media01/public/system/65a9c7a8c03a819e147fd6ab/teamchat/12007b06-e1f7-4977-b5fb-f69820d3af3b/1762204352_image.png" 
              alt="C-Vale Logo" 
              className="h-16 mb-6 object-contain"
            />
            <h1 className="text-center mb-2 text-slate-900">Dia de Campo C. Vale</h1>
            <p className="text-slate-600 text-center text-sm">
              Configure e dispare as mensagens com eficiência
            </p>
          </div>

          <div className="space-y-5">
            {/* Upload de Arquivo */}
            <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border-2 border-slate-200 shadow-lg">
              <FileUpload 
                uploadedFile={uploadedFile}
                onFileSelected={setUploadedFile}
                onSpreadsheetDataExtracted={setSpreadsheetData}
              />
            </div>

            {/* Configuração de Tempo - só aparece após importar arquivo */}
            {uploadedFile && spreadsheetData.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border-2 border-slate-200 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-slate-700" />
                  <h3 className="text-slate-900">Configuração de Envio</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Campo de tempo por mensagem */}
                  <div className="space-y-2">
                    <Label htmlFor="seconds-per-message" className="text-slate-900">
                      Tempo entre mensagens (segundos)
                    </Label>
                    <Input
                      id="seconds-per-message"
                      type="number"
                      min="1"
                      max="3600"
                      value={secondsPerMessage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setSecondsPerMessage(Math.max(1, Math.min(3600, value)));
                      }}
                      className="bg-white border-slate-300"
                    />
                    <p className="text-xs text-slate-600">
                      Intervalo entre cada envio
                    </p>
                  </div>

                  {/* Cálculo do tempo total */}
                  <div className="space-y-2">
                    <Label className="text-slate-900">
                      Tempo total estimado
                    </Label>
                    <div className="bg-white border border-slate-300 rounded-md px-3 py-2 h-10 flex items-center">
                      <span className="text-slate-900">
                        {(() => {
                          const totalSeconds = spreadsheetData.length * secondsPerMessage;
                          const hours = Math.floor(totalSeconds / 3600);
                          const minutes = Math.floor((totalSeconds % 3600) / 60);
                          const seconds = totalSeconds % 60;
                          
                          if (hours > 0) {
                            return `${hours}h ${minutes}m ${seconds}s`;
                          } else if (minutes > 0) {
                            return `${minutes}m ${seconds}s`;
                          } else {
                            return `${seconds}s`;
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Para {spreadsheetData.length} {spreadsheetData.length === 1 ? 'registro' : 'registros'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Definir Mensagem - só aparece após importar arquivo */}
            {uploadedFile && (
              <>
                {loadingMessages ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
                        <p className="text-slate-600">Carregando mensagens disponíveis...</p>
                      </div>
                    </div>
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <MessageSelector 
                      messages={messages}
                      onSelectMessage={setSelectedMessage}
                      onUpdateMessage={handleUpdateMessage}
                      onCreateMessage={handleCreateMessage}
                      onDeleteMessage={handleDeleteMessage}
                    />
                  </div>
                ) : messages && messages.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-center py-8">
                      <p className="text-slate-600 mb-4">
                        Nenhum grupo de mensagens cadastrado
                      </p>
                      <Button
                        onClick={() => setCreateDialogOpen(true)}
                        size="lg"
                        className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Grupo de Mensagens
                      </Button>
                    </div>
                  </div>
                ) : null}
                
                {/* Dialog de Criação - usado quando não há mensagens */}
                {messages && messages.length === 0 && (
                  <CreateMessageGroupDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    maxDisparoId={0}
                    onCreate={handleCreateMessage}
                  />
                )}
              </>
            )}
          </div>
        </Card>

      </div>

      {/* Botão Fixo de Disparar - Sempre visível quando há seleção */}
      {messages && selectedMessage && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-slate-900/95 via-slate-900/90 to-transparent backdrop-blur-sm z-50">
          <div className="w-full max-w-4xl mx-auto">
            <Button
              onClick={handleDispatch}
              disabled={dispatching}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 active:from-slate-900 active:to-black text-white shadow-2xl hover:shadow-[0_10px_50px_-15px_rgba(0,0,0,0.8)] transition-all"
              size="lg"
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Disparando Mensagens...
                </>
              ) : dispatchSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mensagens Disparadas com Sucesso
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Enviar mensagens
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
