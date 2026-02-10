"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Puzzle, 
  ArrowLeft,
  Loader2,
  Edit,
  Save,
  X,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Upload,
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PUZZLE_TAGS, parseTags, getTagDisplayName, getTagColor } from "@/lib/puzzleTags";

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  original_filename: string;
  file_path: string;
  category: string | null;
  difficulty: string | null;
  tags: string | null;
  play_count: number | null;
  completion_rate: number | null;
  estimated_solve_time: number | null;
  avg_solve_time: number | null;
  best_score: number | null;
  upload_date: string;
  is_active: boolean;
}

interface PuzzlesResponse {
  puzzles: PuzzleData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminPuzzlesPage() {
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPuzzle, setEditingPuzzle] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PuzzleData>>({});
  
  // Tag management state
  const [editingTags, setEditingTags] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    category: ''
  });

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/puzzles');
      if (!response.ok) throw new Error("Failed to fetch puzzles");
      
      const data: PuzzlesResponse = await response.json();
      setPuzzles(data.puzzles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch puzzles");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPuzzle = (puzzle: PuzzleData) => {
    setEditingPuzzle(puzzle.id);
    setEditData({
      title: puzzle.title,
      description: puzzle.description,
      category: puzzle.category,
      difficulty: puzzle.difficulty,
      estimated_solve_time: puzzle.estimated_solve_time,
      is_active: puzzle.is_active
    });
  };

  const handleSavePuzzle = async (puzzleId: number) => {
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (!response.ok) throw new Error("Failed to update puzzle");

      // Refresh puzzles list
      await fetchPuzzles();
      setEditingPuzzle(null);
      setEditData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update puzzle");
    }
  };

  const handleDeletePuzzle = async (puzzleId: number) => {
    if (!confirm("Are you sure you want to delete this puzzle? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error("Failed to delete puzzle");

      // Refresh puzzles list
      await fetchPuzzles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete puzzle");
    }
  };

  const handleCancelEdit = () => {
    setEditingPuzzle(null);
    setEditData({});
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      
      // Try to extract title from filename if not already set
      if (!uploadForm.title) {
        const nameWithoutExt = file.name.replace(/\.(html?)$/i, '');
        setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('difficulty', uploadForm.difficulty);
      formData.append('category', uploadForm.category);

      const response = await fetch('/api/admin/puzzles/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadSuccess(`Puzzle "${result.puzzle.title}" uploaded successfully!`);
      
      // Reset form
      setSelectedFile(null);
      setUploadForm({
        title: '',
        description: '',
        difficulty: 'medium',
        category: ''
      });
      
      // Refresh puzzles list
      await fetchPuzzles();
      
      // Close modal after a delay
      setTimeout(() => {
        setUploadOpen(false);
        setUploadSuccess(null);
      }, 2000);

    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadForm({
      title: '',
      description: '',
      difficulty: 'medium',
      category: ''
    });
    setUploadError(null);
    setUploadSuccess(null);
  };

  // Tag management functions
  const handleEditTags = (puzzle: PuzzleData) => {
    setEditingTags(puzzle.id);
    setSelectedTags(parseTags(puzzle.tags || ''));
  };

  const handleSaveTags = async (puzzleId: number) => {
    try {
      const response = await fetch(`/api/admin/puzzles/${puzzleId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTags })
      });

      if (!response.ok) throw new Error('Failed to update tags');

      // Update local state
      setPuzzles(prev => prev.map(p => 
        p.id === puzzleId 
          ? { ...p, tags: JSON.stringify(selectedTags) }
          : p
      ));

      setEditingTags(null);
      setSelectedTags([]);
    } catch (err) {
      console.error('Error updating tags:', err);
      alert('Failed to update tags');
    }
  };

  const handleCancelTags = () => {
    setEditingTags(null);
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 'medium': return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case 'hard': return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <Puzzle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Puzzle Management</h1>
                <p className="text-sm text-muted-foreground">Manage puzzle content and settings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={uploadOpen} onOpenChange={(open) => {
                setUploadOpen(open);
                if (!open) resetUploadForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Puzzle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload New Puzzle</DialogTitle>
                    <DialogDescription>
                      Upload an HTML puzzle file with crossword data
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* File Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Puzzle File (HTML)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept=".html"
                          onChange={handleFileSelect}
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                        {selectedFile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            {selectedFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title *</label>
                        <input
                          type="text"
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Puzzle title"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Difficulty</label>
                        <select
                          value={uploadForm.difficulty}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, difficulty: e.target.value }))}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <input
                          type="text"
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="e.g., Technology, Sports"
                        />
                      </div>
                      
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Optional description of the puzzle"
                      />
                    </div>

                    {/* Status Messages */}
                    {uploadError && (
                      <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                        {uploadError}
                      </div>
                    )}
                    
                    {uploadSuccess && (
                      <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
                        {uploadSuccess}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadOpen(false);
                          resetUploadForm();
                        }}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile || !uploadForm.title}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Puzzle
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Tag Editor Dialog */}
              <Dialog open={editingTags !== null} onOpenChange={(open) => !open && handleCancelTags()}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Puzzle Tags</DialogTitle>
                    <DialogDescription>
                      Select tags to categorize this puzzle. Tags help users find and filter puzzles.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Available Tags</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(PUZZLE_TAGS).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`p-2 rounded-md border text-sm transition-colors ${
                              selectedTags.includes(tag)
                                ? `${getTagColor(tag)} border-current`
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            {getTagDisplayName(tag)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Selected Tags</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedTags.length > 0 ? (
                          selectedTags.map((tag) => (
                            <Badge key={tag} className={`text-xs ${getTagColor(tag)}`}>
                              {getTagDisplayName(tag)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No tags selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancelTags}>
                      Cancel
                    </Button>
                    <Button onClick={() => editingTags && handleSaveTags(editingTags)}>
                      Save Tags
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Puzzles List */}
        <Card>
          <CardHeader>
            <CardTitle>Puzzles ({puzzles.length})</CardTitle>
            <CardDescription>
              Manage puzzle metadata, difficulty, and availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading puzzles...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchPuzzles}>Try Again</Button>
              </div>
            ) : puzzles.length === 0 ? (
              <div className="text-center py-12">
                <Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No puzzles found</h3>
                <p className="text-muted-foreground">
                  No puzzles have been uploaded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {puzzles.map((puzzle, index) => (
                  <motion.div
                    key={puzzle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{puzzle.title}</h3>
                          <Badge className={getDifficultyColor(puzzle.difficulty)}>
                            {puzzle.difficulty || "Unknown"}
                          </Badge>
                          <Badge variant={puzzle.is_active ? "default" : "secondary"}>
                            {puzzle.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        {/* Tags Display */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">Tags:</span>
                          {parseTags(puzzle.tags || '').length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {parseTags(puzzle.tags || '').map((tag) => (
                                <Badge key={tag} className={`text-xs ${getTagColor(tag)}`}>
                                  {getTagDisplayName(tag)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {puzzle.description || "No description"}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>ID: {puzzle.id}</span>
                          <span>Plays: {puzzle.play_count || 0}</span>
                          <span>Completion: {puzzle.completion_rate ? `${Number(puzzle.completion_rate).toFixed(1)}%` : "N/A"}</span>
                          <span>Uploaded: {new Date(puzzle.upload_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {editingPuzzle === puzzle.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editData.title || ""}
                              onChange={(e) => setEditData({...editData, title: e.target.value})}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm w-32"
                              placeholder="Title"
                            />
                            <select
                              value={editData.difficulty || ""}
                              onChange={(e) => setEditData({...editData, difficulty: e.target.value})}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                            >
                              <option value="">Difficulty</option>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                            <Button
                              size="sm"
                              variant={editData.is_active ? "default" : "outline"}
                              onClick={() => setEditData({...editData, is_active: !editData.is_active})}
                            >
                              {editData.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" onClick={() => handleSavePuzzle(puzzle.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/puzzles/${puzzle.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditPuzzle(puzzle)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditTags(puzzle)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeletePuzzle(puzzle.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
