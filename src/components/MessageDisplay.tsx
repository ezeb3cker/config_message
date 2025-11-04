import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { FileText, Video } from 'lucide-react';

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

interface MessageDisplayProps {
  messages: MessageGroup[];
  onSelectMessage: (selected: MessageGroup | null) => void;
}

export function MessageDisplay({ messages, onSelectMessage }: MessageDisplayProps) {
  const [selectedDisparoId, setSelectedDisparoId] = useState<string>('');

  const handleSelectionChange = (value: string) => {
    setSelectedDisparoId(value);
    const selected = messages.find(group => group.disparo_id.toString() === value);
    onSelectMessage(selected || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Definir Mensagem</h2>
        <p className="text-muted-foreground mt-1">
          Selecione a mensagem que deseja disparar
        </p>
      </div>

      <ScrollArea className="h-[600px] rounded-md border p-4">
        <RadioGroup value={selectedDisparoId} onValueChange={handleSelectionChange}>
          <div className="space-y-6">
            {messages.map((group, index) => (
              <div key={group.disparo_id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={group.disparo_id.toString()}
                    id={`group-${group.disparo_id}`}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <Label
                      htmlFor={`group-${group.disparo_id}`}
                      className="cursor-pointer"
                    >
                      Grupo de Mensagens #{index + 1}
                    </Label>
                    
                    <div className="pl-4 space-y-4 border-l-2 border-muted">
                      {group.mensagens.map((msg) => (
                        <div key={msg.id} className="space-y-2">
                          <p className="font-medium">{msg.categoria}</p>
                          
                          {/* Estilo WhatsApp: Mídia em cima, texto embaixo */}
                          <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-w-md">
                            {/* Exibir mídia se existir */}
                            {msg.midiaBase64 && msg.midiaExtension && (
                              <div className="mb-2">
                                {msg.midiaExtension.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={`data:image/${msg.midiaExtension.substring(1)};base64,${msg.midiaBase64}`}
                                    alt="Mídia da mensagem"
                                    className="w-full h-auto rounded"
                                  />
                                ) : msg.midiaExtension === '.mp4' ? (
                                  <div className="flex items-center gap-2 p-3 bg-background rounded">
                                    <Video className="w-5 h-5 text-primary" />
                                    <span className="text-sm">Vídeo anexado ({msg.midiaExtension})</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-3 bg-background rounded">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <span className="text-sm">Arquivo anexado ({msg.midiaExtension})</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Texto da mensagem */}
                            {msg.conteudo && (
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {msg.conteudo}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {index < messages.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
      </ScrollArea>
    </div>
  );
}