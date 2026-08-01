import axios from 'axios';
import { ZERNIO_API_KEY, FACEBOOK_PAGE_ID } from './config.js';

export class FacebookPoster {
  constructor() {
    this.apiKey = ZERNIO_API_KEY;
    this.pageId = FACEBOOK_PAGE_ID;
  }

  async postText(content) {
    try {
      const response = await axios.post(
        'https://zernio.com/api/v1/posts/create',
        {
          content: content,
          platforms: [
            {
              platform: 'facebook',
              accountId: this.pageId
            }
          ],
          publish_now: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.post) {
        return {
          success: true,
          post_id: response.data.post.field_id,
          url: response.data.post.platforms?.[0]?.platformPostUrl || ''
        };
      }
      return { success: false, error: 'No post data returned' };
    } catch (error) {
      console.error('Error posting text:', error.message);
      return { success: false, error: error.message };
    }
  }

  async postWithImages(content, imageUrls) {
    try {
      const mediaItems = [];
      for (let idx = 0; idx < Math.min(imageUrls.length, 5); idx++) {
        try {
          const imgUrl = imageUrls[idx];
          const imageResponse = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });

          if (imageResponse.status === 200) {
            // Upload to Zernio
            const formData = new FormData();
            const blob = new Blob([imageResponse.data], {
              type: imageResponse.headers['content-type'] || 'image/jpeg'
            });
            formData.append('file', blob, `image_${idx}.jpg`);

            const uploadResponse = await axios.post(
              'https://zernio.com/api/v1/media/upload',
              formData,
              {
                headers: {
                  'Authorization': `Bearer ${this.apiKey}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );

            if (uploadResponse.data && uploadResponse.data.files) {
              mediaItems.push({
                url: uploadResponse.data.files[0].url,
                type: 'image'
              });
            }
          }
        } catch (error) {
          console.error(`⚠️ Could not upload image ${idx}:`, error.message);
        }
      }

      if (mediaItems.length === 0) {
        return this.postText(content);
      }

      const postData = {
        content: content || ' ',
        media_items: mediaItems,
        platforms: [
          {
            platform: 'facebook',
            accountId: this.pageId
          }
        ],
        publish_now: true
      };

      const response = await axios.post(
        'https://zernio.com/api/v1/posts/create',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.post) {
        return {
          success: true,
          post_id: response.data.post.field_id,
          url: response.data.post.platforms?.[0]?.platformPostUrl || ''
        };
      }
      return { success: false, error: 'No post data returned' };
    } catch (error) {
      console.error('Error posting with images:', error.message);
      return { success: false, error: error.message };
    }
  }
}