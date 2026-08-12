import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import type { StorageKind } from "@/components/storage-image";
import { client } from "@/lib/orpc";

export function newFileId(): string {
	return Crypto.randomUUID();
}

export async function pickImage(options?: {
	allowsEditing?: boolean;
	aspect?: [number, number];
}): Promise<ImagePicker.ImagePickerAsset | null> {
	const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!perm.granted) return null;
	const res = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ["images"],
		quality: 0.7,
		allowsEditing: options?.allowsEditing ?? false,
		aspect: options?.aspect,
	});
	if (res.canceled) return null;
	return res.assets[0] ?? null;
}

async function putBinary(
	uploadUrl: string,
	uri: string,
	contentType: string,
): Promise<void> {
	const res = await FileSystem.uploadAsync(uploadUrl, uri, {
		httpMethod: "PUT",
		uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
		headers: { "Content-Type": contentType },
	});
	if (res.status < 200 || res.status >= 300) {
		throw new Error(`Upload failed (${res.status})`);
	}
}

/**
 * Presigned-PUT upload: uploadInit -> binary PUT to S3 -> finalize.
 * Returns the fileId to store on the owning record (gallery item, profile, …).
 */
export async function uploadImage(
	kind: StorageKind,
	asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
	const fileId = newFileId();
	const contentType = asset.mimeType ?? "image/jpeg";
	const { uploadUrl } = await client.storage.uploadInit({
		kind,
		fileId,
		contentType,
	});
	await putBinary(uploadUrl, asset.uri, contentType);
	await client.storage.finalize({ kind, fileId });
	return fileId;
}

/**
 * Bio images use their own endpoints: they're addressed by a stable public path
 * embedded in the bio HTML rather than by a fileId on a record.
 * Returns that path (e.g. /api/files/bio-image/<user>/<id>).
 */
export async function uploadBioImage(
	asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
	const contentType = asset.mimeType ?? "image/jpeg";
	const init = await client.profile.bioImageInit({ contentType });
	await putBinary(init.uploadUrl, asset.uri, contentType);
	const { publicPath } = await client.profile.bioImageFinalize({
		fileId: init.fileId,
	});
	return publicPath;
}
