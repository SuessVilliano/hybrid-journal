import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GripVertical, Settings } from 'lucide-react';

export default function QuickAccessPanel({ quickAccess, allNavigation, onReorder, onReplace, darkMode }) {
  const quickAccessItems = quickAccess.map(id => allNavigation.find(item => item.id === id)).filter(Boolean);
  
  return (
    <div className={`px-4 py-3 border-y ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
      <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Quick Access</div>
      <DragDropContext onDragEnd={onReorder}>
        <Droppable droppableId="quick-access" direction="horizontal">
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-4 gap-2"
            >
              {quickAccessItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? 'opacity-50' : ''}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {item.external ? (
                              <a
                                href={item.external}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`relative group flex flex-col items-center justify-center p-3 rounded-lg transition-all cursor-pointer ${
                                  darkMode ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                                }`}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <Icon className={`h-5 w-5 mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                                <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {item.name}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Settings className="h-3 w-3 text-slate-400" />
                                </button>
                              </a>
                            ) : (
                              <Link
                                to={createPageUrl(item.page)}
                                className={`relative group flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
                                  darkMode ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                                }`}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                <Icon className={`h-5 w-5 mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                                <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {item.name}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Settings className="h-3 w-3 text-slate-400" />
                                </button>
                              </Link>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                            <div className={`px-2 py-1.5 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Replace with:
                            </div>
                            {allNavigation.filter(nav => !quickAccess.includes(nav.id)).map(nav => (
                              <DropdownMenuItem
                                key={nav.id}
                                onClick={() => onReplace(index, nav.id)}
                                className="cursor-pointer"
                              >
                                <nav.icon className="h-4 w-4 mr-2" />
                                {nav.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}