import { pb } from '@/integrations/pocketbase/client';

export interface LogParams {
    userId: string;
    action: string;
    targetCollection?: string;
    targetId?: string;
    description: string;
}

/**
 * Logs an activity to the system_logs collection
 */
export async function logActivity({
    userId,
    action,
    targetCollection,
    targetId,
    description,
}: LogParams) {
    try {
        await pb.collection('system_logs').create({
            user_id: userId,
            action,
            target_collection: targetCollection,
            target_id: targetId,
            description,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error creating activity log:', error);
        // We don't want to throw error here to avoid blocking the main action
    }
}
