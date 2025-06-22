'use client';
import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import NewProjectModal from '@/components/NewProjectModal';
import ProjectCardMenu from '@/components/ProjectCardMenu';
import RenameProjectModal from '@/components/RenameProjectModal';
import DeleteProjectModal from '@/components/DeleteProjectModal';
import { getProjects, createProject, renameProject, deleteProject } from '@/lib/dashboardApi';
import { WorkspaceContext } from './layout';
import { PaintBrushIcon } from '@heroicons/react/24/outline';

const tabs = [
  { label: 'Recently viewed', value: 'recent' },
  { label: 'Design Canvas', value: 'design' },
  { label: 'Shared files', value: 'shared-files' },
  { label: 'Shared projects', value: 'shared-projects' },
];

export default function DashboardPage() {
  const { activeWorkspace } = useContext(WorkspaceContext);
  const [activeTab, setActiveTab] = useState('recent');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [renameModal, setRenameModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    getProjects(activeWorkspace.id)
      .then(data => setProjects(data))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  const handleCreateProject = async (name: string, template: string) => {
    if (!activeWorkspace) return;
    
    try {
    setLoading(true);
      console.log('Creating project:', { name, template, workspaceId: activeWorkspace.id });
      
      // Create the project with template
      const newProject = await createProject(activeWorkspace.id, name, template);
      console.log('Project created:', newProject);
      
      // Refresh the projects list
      const updatedProjects = await getProjects(activeWorkspace.id);
      setProjects(updatedProjects);
      
    setShowNewProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      // You might want to show an error message to the user here
    } finally {
    setLoading(false);
    }
  };

  const handleRenameProject = async (id: string, newName: string) => {
    setLoading(true);
    await renameProject(id, newName);
    if (activeWorkspace) {
      const data = await getProjects(activeWorkspace.id);
      setProjects(data);
    }
    setRenameModal({ open: false, id: null });
    setLoading(false);
  };

  const handleDeleteProject = async (id: string) => {
    setLoading(true);
    await deleteProject(id);
    if (activeWorkspace) {
      const data = await getProjects(activeWorkspace.id);
      setProjects(data);
    }
    setDeleteModal({ open: false, id: null });
    setLoading(false);
  };

  return (
    <div className="w-full">
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onCreate={handleCreateProject} />
      <RenameProjectModal
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, id: null })}
        onRename={newName => renameModal.id && handleRenameProject(renameModal.id, newName)}
        currentName={renameModal.id ? (projects.find(p => p.id === renameModal.id)?.name || '') : ''}
      />
      <DeleteProjectModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onDelete={() => deleteModal.id && handleDeleteProject(deleteModal.id)}
        projectName={deleteModal.id ? (projects.find(p => p.id === deleteModal.id)?.name || '') : ''}
      />
      {/* Tabs */}
      <div className="flex items-center gap-6 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`text-base font-medium pb-2 border-b-2 transition-all ${activeTab === tab.value ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center space-x-3">
          <Link href="/dashboard/design">
            <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg px-5 py-2 shadow hover:brightness-110 transition">
              <PaintBrushIcon className="w-4 h-4" />
              <span>Design Canvas</span>
            </button>
          </Link>
          <button onClick={() => setShowNewProject(true)} className="bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 text-white font-semibold rounded-lg px-5 py-2 shadow hover:brightness-110 transition">+ New Project</button>
        </div>
      </div>
      {/* Project grid */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No projects in this workspace.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* New Project Card */}
          <div onClick={() => setShowNewProject(true)} className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-white rounded-xl h-48 cursor-pointer hover:border-blue-400 transition">
            <span className="text-4xl text-blue-300 mb-2">+</span>
            <span className="font-medium text-blue-500">New Project</span>
          </div>
          {/* Project Cards */}
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl shadow p-4 flex flex-col h-48 justify-between cursor-pointer hover:shadow-lg transition group">
              <div className="flex-1 flex items-center justify-center bg-gray-100 rounded mb-3 relative">
                {/* Placeholder for thumbnail */}
                <span className="text-2xl text-gray-300">🗂️</span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ProjectCardMenu
                    onRename={() => setRenameModal({ open: true, id: project.id })}
                    onDelete={() => setDeleteModal({ open: true, id: project.id })}
                  />
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 truncate">{project.name}</div>
                <div className="text-xs text-gray-400">Created {project.createdAt ? new Date(project.createdAt).toLocaleString() : ''}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-green-300 via-blue-400 to-purple-400"></span>
                  <span className="text-xs text-gray-500">{project.template || 'Project'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 