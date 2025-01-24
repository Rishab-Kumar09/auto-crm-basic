import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  allowedFileTypes?: string[];
}

export const FileUpload = ({
  onFileSelect,
  selectedFiles,
  onRemoveFile,
  maxFiles = 5,
  maxSizeInMB = 10,
  allowedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt']
}: FileUploadProps) => {
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    
    // Validate number of files
    if (newFiles.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Error",
        description: `You can only upload up to ${maxFiles} files at a time.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file types and sizes
    const invalidFiles = newFiles.filter(file => {
      const validType = allowedFileTypes.some(type => {
        if (type.includes('/*')) {
          const [mainType] = type.split('/');
          return file.type.startsWith(mainType);
        }
        return file.type === type || type.includes(file.name.split('.').pop() || '');
      });

      const validSize = file.size <= maxSizeInMB * 1024 * 1024;

      if (!validType) {
        toast({
          title: "Error",
          description: `File type not allowed: ${file.name}`,
          variant: "destructive",
        });
      }

      if (!validSize) {
        toast({
          title: "Error",
          description: `File too large: ${file.name}. Maximum size is ${maxSizeInMB}MB.`,
          variant: "destructive",
        });
      }

      return !validType || !validSize;
    });

    if (invalidFiles.length > 0) return;

    onFileSelect(newFiles);
  }, [selectedFiles, maxFiles, maxSizeInMB, allowedFileTypes, toast, onFileSelect]);

  return (
    <div className="space-y-4">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          Attach Files
        </Button>
      </div>

      <input
        id="file-upload"
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept={allowedFileTypes.join(',')}
      />

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 