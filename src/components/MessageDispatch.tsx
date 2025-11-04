import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Send, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface Message {
  categoria: string;
  conteudo: string;
}

interface MessageGroup {
  disparo_id: number;
  mensagens: Message[];
}

interface MessageDispatchProps {
  selectedMessages: MessageGroup[];
}

export function MessageDispatch({ selectedMessages }: MessageDispatchProps) {
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const formatMessagesForDisplay = () => {
    return selectedMessages.map((group, index) => {
      const formattedMessages = group.mensagens
        .map(msg => `*${msg.categoria}*\n${msg.conteudo}`)
        .join('\n\n');
      
      return formattedMessages;
    }).join('\n\n---\n\n');
  };

  const handleDispatch = async () => {
    if (selectedMessages.length === 0) {
      toast.error('Nenhuma mensagem selecionada para disparar');
      return;
    }

    setDispatching(true);
    setDispatchSuccess(false);

    try {
      // Simular envio - substituir pela lógica real de disparo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aqui você pode fazer uma chamada para outro endpoint para disparar as mensagens
      // const response = await fetch('URL_DO_ENDPOINT_DE_DISPARO', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ messages: selectedMessages }),
      // });

      setDispatchSuccess(true);
      toast.success(`${selectedMessages.length} grupo(s) de mensagens disparado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao disparar mensagens:', error);
      toast.error('Erro ao disparar mensagens. Tente novamente.');
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = () => {
    const formattedText = formatMessagesForDisplay();
    navigator.clipboard.writeText(formattedText);
    toast.success('Mensagens copiadas para a área de transferência');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Disparar Mensagens</h2>
        <p className="text-muted-foreground mt-1">
          Revise e dispare as mensagens selecionadas
        </p>
      </div>

      {selectedMessages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma mensagem selecionada</p>
          <p className="text-sm mt-2">
            Volte para "Definir Mensagens" e selecione as mensagens que deseja disparar
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="default">
              {selectedMessages.length} grupo(s) de mensagens selecionado(s)
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Mensagens
            </Button>
          </div>

          <div>
            <Label>Visualização das Mensagens</Label>
            <ScrollArea className="h-[400px] mt-2 rounded-md border p-4 bg-muted/30">
              <div className="space-y-6 whitespace-pre-wrap">
                {selectedMessages.map((group, groupIndex) => (
                  <div key={group.disparo_id} className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Grupo #{groupIndex + 1}
                    </div>
                    {group.mensagens.map((msg, msgIndex) => (
                      <div key={msgIndex} className="space-y-1">
                        <p className="font-medium">{msg.categoria}</p>
                        <p>{msg.conteudo}</p>
                      </div>
                    ))}
                    {groupIndex < selectedMessages.length - 1 && (
                      <div className="border-t border-border my-4"></div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <Label htmlFor="custom-message">
              Mensagem Personalizada (Opcional)
            </Label>
            <Textarea
              id="custom-message"
              placeholder="Adicione uma mensagem personalizada que será incluída em todos os disparos..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDispatch}
              disabled={dispatching || selectedMessages.length === 0}
              className="flex-1"
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disparando...
                </>
              ) : dispatchSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Disparado com Sucesso
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Disparar Mensagens
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}