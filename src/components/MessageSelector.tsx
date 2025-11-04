import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ChevronDown, Check, Pencil, Plus, Trash2, Loader2, FileText, Video, Image as ImageIcon } from 'lucide-react';
import { cn } from './ui/utils';
import { MessageEditDialog } from './MessageEditDialog';
import { CreateMessageGroupDialog } from './CreateMessageGroupDialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';

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

interface MessageSelectorProps {
  messages: MessageGroup[];
  onSelectMessage: (selected: MessageGroup | null) => void;
  onUpdateMessage?: (updatedGroup: MessageGroup) => void;
  onCreateMessage?: (newGroup: MessageGroup) => void;
  onDeleteMessage?: (deletedGroup: MessageGroup) => void;
}

export function MessageSelector({ messages, onSelectMessage, onUpdateMessage, onCreateMessage, onDeleteMessage }: MessageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageGroup | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<MessageGroup | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<MessageGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectMessage = (group: MessageGroup) => {
    setSelectedMessage(group);
    onSelectMessage(group);
    setOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent, group: MessageGroup) => {
    e.stopPropagation();
    setMessageToEdit(group);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, group: MessageGroup) => {
    e.stopPropagation();
    setMessageToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch('https://dev.gruponfa.com/webhook/0e550a2f-177e-4450-b5ee-115b657c9c39', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageToDelete),
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir grupo de mensagens');
      }

      // Notificar o componente pai para remover o grupo
      if (onDeleteMessage) {
        onDeleteMessage(messageToDelete);
      }

      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      toast.error('Erro ao excluir grupo de mensagens. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = (updatedGroup: MessageGroup) => {
    // Atualizar a mensagem selecionada se for a mesma que foi editada
    if (selectedMessage?.disparo_id === updatedGroup.disparo_id) {
      setSelectedMessage(updatedGroup);
      onSelectMessage(updatedGroup);
    }
    
    // Notificar o componente pai para atualizar a lista
    if (onUpdateMessage) {
      onUpdateMessage(updatedGroup);
    }
  };

  const handleCreateGroup = (newGroup: MessageGroup) => {
    // Notificar o componente pai para adicionar o novo grupo
    if (onCreateMessage) {
      onCreateMessage(newGroup);
    }
  };

  const getMaxDisparoId = () => {
    if (messages.length === 0) return 0;
    return Math.max(...messages.map(m => m.disparo_id));
  };

  const getSelectedLabel = () => {
    if (!selectedMessage) return 'Selecione uma mensagem';
    const index = messages.findIndex(m => m.disparo_id === selectedMessage.disparo_id);
    return `Grupo de Mensagens #${index + 1}`;
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-900">Definir Mensagem</Label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm transition-colors",
          "hover:bg-slate-50 hover:border-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
          !selectedMessage ? "text-slate-500" : "text-slate-900"
        )}
      >
        <span>{getSelectedLabel()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {selectedMessage && (
        <div className="rounded-md border bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm text-slate-700">Mensagens selecionadas:</span>
          </div>
          <div className="pl-6 space-y-3">
            {selectedMessage.mensagens.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <p className="font-medium text-slate-900">{msg.categoria}</p>
                <div className="bg-white rounded-lg p-3 space-y-2 border border-slate-200">
                  {msg.midiaBase64 && msg.midiaExtension && (
                    <div className="mb-2">
                      {msg.midiaExtension.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <ImageIcon className="w-4 h-4" />
                          <span>Imagem anexada</span>
                        </div>
                      ) : msg.midiaExtension === '.mp4' ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Video className="w-4 h-4" />
                          <span>Vídeo anexado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileText className="w-4 h-4" />
                          <span>Arquivo anexado ({msg.midiaExtension})</span>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.conteudo && (
                    <p className="text-sm text-slate-700">{msg.conteudo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecione uma Mensagem</DialogTitle>
            <DialogDescription>
              Escolha o grupo de mensagens que deseja disparar
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {messages.map((group, index) => (
                <div
                  key={group.disparo_id}
                  className="relative"
                  onMouseEnter={() => setHoveredGroupId(group.disparo_id)}
                  onMouseLeave={() => setHoveredGroupId(null)}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectMessage(group)}
                    className={cn(
                      "w-full text-left rounded-lg border-2 p-4 transition-all bg-card",
                      "hover:border-slate-400",
                      selectedMessage?.disparo_id === group.disparo_id
                        ? "border-slate-600"
                        : "border-border"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-slate-900">Grupo de Mensagens #{index + 1}</h3>
                        <div className="flex items-center gap-2">
                          {selectedMessage?.disparo_id === group.disparo_id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                        {group.mensagens.map((msg) => (
                          <div key={msg.id} className="space-y-2">
                            <p className="font-medium text-slate-900">{msg.categoria}</p>
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                              {msg.midiaBase64 && msg.midiaExtension && (
                                <div className="mb-2">
                                  {msg.midiaExtension.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <ImageIcon className="w-4 h-4" />
                                      <span>Imagem anexada</span>
                                    </div>
                                  ) : msg.midiaExtension === '.mp4' ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Video className="w-4 h-4" />
                                      <span>Vídeo anexado</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <FileText className="w-4 h-4" />
                                      <span>Arquivo anexado ({msg.midiaExtension})</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {msg.conteudo && (
                                <p className="text-sm text-slate-700">{msg.conteudo}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                  
                  {/* Botões de Editar e Excluir - aparecem no hover */}
                  {hoveredGroupId === group.disparo_id && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, group)}
                        className={cn(
                          "p-2 rounded-md",
                          "bg-background border border-border shadow-sm",
                          "hover:bg-primary hover:text-primary-foreground",
                          "transition-all duration-200"
                        )}
                        title="Editar mensagens"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, group)}
                        className={cn(
                          "p-2 rounded-md",
                          "bg-background border border-border shadow-sm",
                          "hover:bg-destructive hover:text-destructive-foreground",
                          "transition-all duration-200"
                        )}
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <Separator className="my-6" />

              {/* Botão de Criar Grupo de Mensagens */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-2 h-auto py-6"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Grupo de Mensagens
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <MessageEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        messageGroup={messageToEdit}
        onSave={handleSaveEdit}
      />

      {/* Dialog de Criação */}
      <CreateMessageGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        maxDisparoId={getMaxDisparoId()}
        onCreate={handleCreateGroup}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este grupo de mensagens? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {messageToDelete && (
            <div className="rounded-md border bg-muted/30 p-4 space-y-3 max-h-[200px] overflow-y-auto">
              {messageToDelete.mensagens.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <p className="font-medium text-sm">{msg.categoria}</p>
                  {msg.midiaBase64 && msg.midiaExtension && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="w-3 h-3" />
                      <span className="text-xs">Mídia anexada</span>
                    </div>
                  )}
                  {msg.conteudo && (
                    <p className="text-sm text-muted-foreground">{msg.conteudo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}