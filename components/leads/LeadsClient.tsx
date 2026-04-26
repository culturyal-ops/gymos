"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/Button";
import { AddLeadModal } from "@/components/modals/AddLeadModal";
import { cn } from "@/lib/utils/cn";
import type { Lead, LeadStage } from "@/lib/types";

const columns: { key: LeadStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "--color-blue" },
  { key: "ai_replied", label: "AI Replied", color: "--color-gold" },
  { key: "followed_up", label: "Followed Up", color: "--color-amber" },
  { key: "converted", label: "Converted", color: "--color-green" },
];

const sourceBadgeColors: Record<string, string> = {
  instagram_ad: "bg-[#E1306C18] text-[#E1306C]",
  whatsapp: "bg-[--color-green-dim] text-[--color-green]",
  walkin: "bg-[--color-blue-dim] text-[--color-blue]",
  referral: "bg-[--color-gold-dim] text-[--color-gold]",
};

const sourceLabels: Record<string, string> = {
  instagram_ad: "Instagram",
  whatsapp: "WhatsApp",
  walkin: "Walk-in",
  referral: "Referral",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface LeadsClientProps {
  initialLeads: Lead[];
}

export function LeadsClient({ initialLeads }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [addOpen, setAddOpen] = useState(false);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStage = result.destination.droppableId as LeadStage;
      setLeads((prev) =>
        prev.map((l) => (l.id === result.draggableId ? { ...l, stage: newStage } : l))
      );
      // TODO: Update in Supabase via Server Action
    },
    []
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads Pipeline</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            {leads.length} total leads · Drag to update stage
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          + Add Lead
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {columns.map((col) => {
            const colLeads = leads.filter((l) => l.stage === col.key);
            return (
              <Droppable key={col.key} droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[400px] rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface] p-3 transition-colors",
                      snapshot.isDraggingOver && "border-[--color-border-hover] bg-[--color-surface-2]"
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: `var(${col.color})` }}
                        />
                        <h3 className="text-sm font-medium">{col.label}</h3>
                      </div>
                      <span className="rounded-full bg-[--color-surface-3] px-2 py-0.5 text-xs text-[--color-text-secondary]">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {colLeads.map((lead, idx) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3 transition-all",
                                dragSnapshot.isDragging && "border-[--color-gold] shadow-lg"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-[--color-text-primary]">
                                  {lead.name}
                                </p>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    sourceBadgeColors[lead.source ?? "walkin"]
                                  )}
                                >
                                  {sourceLabels[lead.source ?? "walkin"]}
                                </span>
                              </div>
                              {lead.query_text && (
                                <p className="mt-1.5 text-xs text-[--color-text-secondary] line-clamp-2">
                                  &ldquo;{lead.query_text}&rdquo;
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-[--color-text-muted]">
                                  {timeAgo(lead.created_at)}
                                </span>
                                {col.key !== "converted" && (
                                  <button className="rounded bg-[--color-gold-dim] px-2 py-0.5 text-[10px] font-medium text-[--color-gold] transition-colors hover:bg-[--color-gold] hover:text-black">
                                    Follow Up
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
