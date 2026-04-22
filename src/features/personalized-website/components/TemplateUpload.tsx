import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/junie-pipeline/client";
import { motion } from "framer-motion";
import { Upload, Trash2, FolderOpen, File, RefreshCw, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  isFile: boolean;
}

export default function TemplateUpload() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const allFiles = await listAllFiles("templates", "");
      setFiles(allFiles.sort());
    } catch (err) {
      console.error("Error listing template files:", err);
    }
    setLoading(false);
  }

  async function listAllFiles(bucket: string, prefix: string): Promise<string[]> {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data) return [];
    const result: string[] = [];
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) result.push(path);
      else result.push(...(await listAllFiles(bucket, path)));
    }
    return result;
  }

  async function handleFileUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    const total = fileList.length;
    try {
      for (const file of Array.from(fileList)) {
        const relativePath = (file as any).webkitRelativePath || file.name;
        setUploadProgress(`Uploading ${uploaded + 1}/${total}: ${relativePath}`);
        const { error } = await supabase.storage.from("templates").upload(relativePath, file, { upsert: true });
        if (error) toast({ title: `Failed: ${relativePath}`, description: error.message, variant: "destructive" });
        uploaded++;
      }
      toast({ title: `Uploaded ${uploaded} file${uploaded !== 1 ? "s" : ""}` });
      await fetchFiles();
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  async function deleteFile(path: string) {
    const { error } = await supabase.storage.from("templates").remove([path]);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else setFiles((prev) => prev.filter((f) => f !== path));
  }

  function buildTree(paths: string[]): TreeNode {
    const root: TreeNode = { name: "", path: "", children: {}, isFile: false };
    paths.forEach((p) => {
      const parts = p.split("/");
      let current = root;
      parts.forEach((part, i) => {
        if (!current.children[part]) {
          current.children[part] = { name: part, path: parts.slice(0, i + 1).join("/"), children: {}, isFile: i === parts.length - 1 };
        }
        current = current.children[part];
      });
    });
    return root;
  }

  const tree = buildTree(files);

  function toggleDir(path: string) {
    setExpandedDirs((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  function renderNode(node: TreeNode, depth = 0): React.ReactNode {
    const entries = Object.values(node.children).sort((a, b) => {
      if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
      return a.isFile ? 1 : -1;
    });
    return entries.map((child) => {
      if (child.isFile) {
        return (
          <div key={child.path} className="flex items-center justify-between group py-0.5 px-1 rounded hover:bg-muted/30" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <File className="w-3 h-3 flex-shrink-0" /><span className="truncate">{child.name}</span>
            </div>
            <button onClick={() => deleteFile(child.path)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      }
      const isExpanded = expandedDirs[child.path] ?? !child.name.includes("_files");
      return (
        <div key={child.path}>
          <button onClick={() => toggleDir(child.path)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground py-0.5 px-1 rounded hover:bg-muted/30 w-full text-left" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <FolderOpen className="w-3 h-3" /><span>{child.name}/</span>
          </button>
          {isExpanded && renderNode(child, depth + 1)}
        </div>
      );
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Demo Template Files</h2>
          <p className="text-xs text-muted-foreground/70 mt-1">Upload your HTML template and assets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFiles} disabled={uploading}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        <input ref={folderInputRef} type="file" {...({ webkitdirectory: "", directory: "" } as any)} multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="w-3 h-3 mr-1" /> Upload Files</Button>
        <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()} disabled={uploading}><FolderOpen className="w-3 h-3 mr-1" /> Upload Folder</Button>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Loader2 className="w-3 h-3 animate-spin" />{uploadProgress}
        </div>
      )}

      {loading ? <div className="text-xs text-muted-foreground py-4 text-center">Loading files...</div>
        : files.length === 0 ? <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/50 rounded-lg">No template files uploaded yet.</div>
        : <div className="max-h-[400px] overflow-y-auto border border-border/30 rounded-lg p-2">{renderNode(tree)}</div>}
    </motion.div>
  );
}
