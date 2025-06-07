"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

// Adjusted for free plan limitations
const MAX_UPLOAD_TIME = 55; // 55 seconds to allow for overhead
const RECOMMENDED_MAX_SIZE = 15 * 1024 * 1024; // 15MB recommended for 60s timeout

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    // Pre-upload size check
    if (file.size > RECOMMENDED_MAX_SIZE) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) is too large for reliable upload. Please use files smaller than 15MB to ensure successful upload within the time limit.`);
    }

    // Set up upload timeout for free plan
    const uploadPromise = async () => {
      // Convert file to buffer with proper error handling
      const buffer = await file.arrayBuffer().catch(error => {
        throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

      // Create input file
      const inputFile = InputFile.fromBuffer(Buffer.from(buffer), file.name);
      
      // Upload file with unique ID
      const uploadedFile = await storage.createFile(
        appwriteConfig.bucketId,
        ID.unique(),
        inputFile
      );

      if (!uploadedFile) {
        throw new Error("Failed to upload file to storage");
      }

      // Create the file document with Appwrite's required structure
      const fileInfo = getFileType(uploadedFile.name);
      const fileDocument = {
        type: fileInfo.type,
        name: uploadedFile.name,
        url: constructFileUrl(uploadedFile.$id),
        extension: fileInfo.extension,
        size: uploadedFile.sizeOriginal,
        owner: ownerId,
        accountId,
        users: [],
        bucketField: `${appwriteConfig.bucketId}/${uploadedFile.$id}`,
      };

      // Create document in database
      const newFile = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument,
      );

      if (!newFile) {
        // Cleanup: delete uploaded file if document creation fails
        await storage.deleteFile(appwriteConfig.bucketId, uploadedFile.$id);
        throw new Error("Failed to create file document");
      }

      return newFile;
    };

    // Set up timeout promise for free plan
    const timeoutPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        reject(new Error(`Upload timed out after ${MAX_UPLOAD_TIME} seconds. Please try a smaller file.`));
      }, MAX_UPLOAD_TIME * 1000);
    });

    // Race between upload and timeout
    const newFile = await Promise.race([uploadPromise(), timeoutPromise]);

    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    if (error instanceof Error) {
      let errorMessage = `Failed to upload file: ${error.message}`;
      if (error.message.includes('timeout')) {
        errorMessage = `Upload timed out. Please try a file smaller than 15MB.`;
      } else if (error.message.includes('too large')) {
        errorMessage = error.message;
      }
      handleError(error, errorMessage);
    } else {
      handleError(error, "Failed to upload file: Unknown error");
    }
    return null;
  }
};

const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  const queries = [
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];

  if (types.length > 0) queries.push(Query.equal("type", types));
  if (searchText) queries.push(Query.contains("name", searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    const [sortBy, orderBy] = sort.split("-");

    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
    );
  }

  return queries;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error("User not found");

    const queries = createQueries(currentUser, types, searchText, sort, limit);

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries,
    );

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    const newName = `${name}.${extension}`;
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName,
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        users: emails,
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};

export const deleteFile = async ({
  fileId,
  path,
}: DeleteFileProps) => {
  const { databases, storage } = await createAdminClient();

  try {
    // First get the file document to access its bucket info
    const file = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    if (!file) {
      throw new Error("File not found");
    }

    // Delete the database document
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    if (deletedFile) {
      // Parse the bucketField string to get bucketId and fileId
      const [bucketId, fileId] = file.bucketField.split("/");
      // Delete the actual file from storage
      await storage.deleteFile(bucketId, fileId);
    }

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

// ============================== TOTAL FILE SPACE USED
export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("owner", [currentUser.$id])]
    );

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}
