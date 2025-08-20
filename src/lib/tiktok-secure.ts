import { supabase } from "@/integrations/supabase/client";

/**
 * Secure utilities for managing TikTok tokens
 * Tokens are stored securely in Supabase Vault, not in the database
 */

export interface TikTokTokens {
  access_token: string | null;
  refresh_token: string | null;
  note?: string;
}

/**
 * Securely store TikTok tokens for an account
 * @param accountId - The TikTok account ID
 * @param accessToken - The access token to store
 * @param refreshToken - The refresh token to store
 * @returns Promise with the vault key or error
 */
export async function storeTikTokTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('store_tiktok_tokens', {
      account_id: accountId,
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Error storing TikTok tokens:', error);
      return { data: null, error: new Error('Failed to store tokens securely') };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error storing TikTok tokens:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Securely retrieve TikTok tokens for an account
 * @param accountId - The TikTok account ID
 * @returns Promise with the tokens or error
 */
export async function getTikTokTokens(
  accountId: string
): Promise<{ data: TikTokTokens | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_tiktok_tokens', {
      account_id: accountId
    });

    if (error) {
      console.error('Error retrieving TikTok tokens:', error);
      return { data: null, error: new Error('Failed to retrieve tokens') };
    }

    return { data: (data as unknown) as TikTokTokens, error: null };
  } catch (err) {
    console.error('Unexpected error retrieving TikTok tokens:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Securely update TikTok tokens for an account
 * @param accountId - The TikTok account ID
 * @param newAccessToken - New access token (optional)
 * @param newRefreshToken - New refresh token (optional)
 * @returns Promise with success status or error
 */
export async function updateTikTokTokens(
  accountId: string,
  newAccessToken?: string,
  newRefreshToken?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('update_tiktok_tokens', {
      account_id: accountId,
      new_access_token: newAccessToken,
      new_refresh_token: newRefreshToken
    });

    if (error) {
      console.error('Error updating TikTok tokens:', error);
      return { success: false, error: new Error('Failed to update tokens') };
    }

    return { success: data, error: null };
  } catch (err) {
    console.error('Unexpected error updating TikTok tokens:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * Check if TikTok account has valid tokens
 * @param accountId - The TikTok account ID
 * @returns Promise with validation status
 */
export async function validateTikTokTokens(
  accountId: string
): Promise<{ isValid: boolean; error: Error | null }> {
  const { data, error } = await getTikTokTokens(accountId);
  
  if (error) {
    return { isValid: false, error };
  }

  // In a full implementation, this would check token expiry and validity
  const isValid = data?.access_token != null && data?.refresh_token != null;
  
  return { isValid, error: null };
}