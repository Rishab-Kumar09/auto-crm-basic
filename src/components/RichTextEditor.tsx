import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateResponse } from '@/lib/ai-service';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAIResponse?: (response: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, onAIResponse }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();

      // Special handling for lists
      if (command === 'insertUnorderedList') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const parentList = range.commonAncestorContainer.parentElement;

          // If we're already in a list, remove it
          if (parentList?.tagName === 'LI' || parentList?.tagName === 'UL') {
            document.execCommand('outdent', false);
          } else {
            // Create new list
            document.execCommand(command, false);
          }
        } else {
          // No selection, just create a new list
          document.execCommand(command, false);
        }
      } else {
        // For other commands, execute normally
        document.execCommand(command, false, value);
      }

      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentList = range.commonAncestorContainer.parentElement;

        // If we're in an empty list item, remove it and exit the list
        if (parentList?.tagName === 'LI' && parentList.textContent?.trim() === '') {
          e.preventDefault();
          document.execCommand('outdent', false);
          return;
        }
      }
    }
  };

  const handleAIResponse = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await generateResponse(value, []);
      if (onAIResponse) {
        onAIResponse(response.content);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-md">
        <div className="border-b p-2 bg-gray-50 flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('bold')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('italic')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('underline')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('justifyLeft')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('justifyCenter')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand('justifyRight')}
            className="h-8 w-8 p-0"
            type="button"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          {onAIResponse && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleAIResponse}
              disabled={isGeneratingAI}
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                '🤖 Get AI Suggestion'
              )}
            </Button>
          )}
        </div>
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            'p-3 min-h-[150px] focus:outline-none',
            'before:content-[attr(data-placeholder)] before:text-gray-400 before:pointer-events-none',
            value === '' && !isFocused && 'before:block',
            value !== '' && 'before:hidden'
          )}
          data-placeholder={placeholder}
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
