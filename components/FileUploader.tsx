"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "@/components/Thumbnail";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";

// For free plan limitations
const RECOMMENDED_MAX_SIZE = 15 * 1024 * 1024; // 15MB recommended

interface Props {
  ownerId: string;
  accountId: string;
  className?: string;
}

const FileUploader = ({ ownerId, accountId, className }: Props) => {
  const path = usePathname();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (isUploading) return;

      // Check file sizes first
      const oversizedFiles = acceptedFiles.filter(
        (file: File) => file.size > RECOMMENDED_MAX_SIZE
      );
      
      if (oversizedFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "File size limit",
          description: "Files over 15MB may fail to upload due to time limitations. Please use smaller files for reliable uploads."
        });
        return;
      }

      setFiles(acceptedFiles);
      setIsUploading(true);

      try {
        const uploadPromises = acceptedFiles.map(async (file: File) => {
          try {
            const uploadedFile = await uploadFile({ 
              file, 
              ownerId, 
              accountId, 
              path 
            });
            
            if (uploadedFile) {
              setFiles((prevFiles: File[]) =>
                prevFiles.filter((f: File) => f.name !== file.name)
              );
              
              toast({
                variant: "default",
                title: "Success",
                description: `${file.name} uploaded successfully.`
              });
            }
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            toast({
              variant: "destructive",
              title: "Upload failed",
              description: error instanceof Error ? error.message : `Failed to upload ${file.name}`
            });
          }
        });

        await Promise.all(uploadPromises);
      } catch (err) {
        console.error("Upload error:", err);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: err instanceof Error ? err.message : "An error occurred while uploading files"
        });
      } finally {
        setIsUploading(false);
      }
    },
    [ownerId, accountId, path, isUploading, toast]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxSize: RECOMMENDED_MAX_SIZE,
    multiple: true
  });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLImageElement>,
    fileName: string
  ) => {
    e.stopPropagation();
    setFiles((prevFiles: File[]) => 
      prevFiles.filter((file: File) => file.name !== fileName)
    );
  };

  if (!mounted) {
    // Return a placeholder with the same structure to prevent hydration issues
    return (
      <div className="cursor-pointer">
        <Button type="button" className={cn("uploader-button", className)}>
          <Image
            src="/assets/icons/upload.svg"
            alt="upload"
            width={24}
            height={24}
          />
          <p>Upload</p>
        </Button>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <Button type="button" className={cn("uploader-button", className)}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />
        <p>Upload</p>
      </Button>

      {files.length > 0 && (
        <ul className="uploader-preview-list mb-20">
          <h4 className="h4 text-gray-500">Uploading</h4>
          {files.map((file, index) => {
            const { type, extension } = getFileType(file.name);
            return (
              <li
                key={`${file.name}-${index}`}
                className="uploader-preview-item"
              >
                <div className="flex items-center gap-3">
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />
                  <div className="preview-item-name flex items-center gap-2">
                    <span className="truncate text-sm sm:text-base">
                      {file.name}
                    </span>
                    {isUploading && (
                      <Image
                        src="/assets/icons/file-loader.gif"
                        width={80}
                        height={26}
                        alt="Loading"
                        className="w-[60px] shrink-0 sm:w-[80px]"
                      />
                    )}
                  </div>
                </div>
                <Image
                  src="/assets/icons/remove.svg"
                  width={24}
                  height={24}
                  alt="Remove"
                  onClick={(e) => handleRemoveFile(e, file.name)}
                  className="cursor-pointer"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
