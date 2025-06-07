"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "@/components/Thumbnail";
import { MAX_FILE_SIZE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";

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
      setFiles(acceptedFiles);
      setIsUploading(true);

      try {
        const uploadPromises = acceptedFiles.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            setFiles((prevFiles) =>
              prevFiles.filter((f) => f.name !== file.name)
            );
            toast({
              variant: "destructive",
              description: (
                <p className="body-2">
                  <span className="font-semibold">{file.name}</span> is too large.
                  Max file size is 50MB.
                </p>
              ),
            });
            return;
          }

          try {
            const uploadedFile = await uploadFile({ file, ownerId, accountId, path });
            
            if (uploadedFile) {
              setFiles((prevFiles) =>
                prevFiles.filter((f) => f.name !== file.name)
              );
              toast({
                variant: "default",
                description: (
                  <p className="body-2">
                    <span className="font-semibold">{file.name}</span> uploaded
                    successfully.
                  </p>
                ),
                className: "bg-brand text-white",
              });
            } else {
              toast({
                variant: "destructive",
                description: (
                  <p className="body-2">
                    Failed to upload <span className="font-semibold">{file.name}</span>
                  </p>
                ),
              });
            }
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            toast({
              variant: "destructive",
              description: (
                <p className="body-2">
                  Error uploading <span className="font-semibold">{file.name}</span>
                  {error instanceof Error ? `: ${error.message}` : ''}
                </p>
              ),
            });
          }
        });

        await Promise.all(uploadPromises);
      } catch (err) {
        console.error("Upload error:", err);
        toast({
          variant: "destructive",
          description: (
            <p className="body-2">
              An error occurred while uploading files.
              {err instanceof Error ? `: ${err.message}` : ''}
            </p>
          ),
        });
      } finally {
        setIsUploading(false);
      }
    },
    [ownerId, accountId, path, isUploading, toast]
  );

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    maxSize: MAX_FILE_SIZE,
    multiple: true 
  });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>,
    fileName: string
  ) => {
    e.stopPropagation();
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  if (!mounted) {
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
