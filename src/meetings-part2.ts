        
        // Get the meeting details to find the room_id
        const meeting = await client.getScheduledMeeting(meeting_id);
        
        // Generate token for the meeting's room
        const tokenOptions = {
          u: participant_name,
          ud: participant_email,
          role: role
        };
        
        const tokenResponse = await client.generateRoomToken(meeting.room_id, tokenOptions);
        
        return {
          content: [
            {
              type: 'text',
              text: `Meeting join link for ${participant_name}:\n\n${tokenResponse.link}\n\nThis link will allow the participant to join the meeting "${meeting.title}" scheduled for ${new Date(meeting.start_time).toLocaleString()} (${meeting.timezone}).`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating meeting join link', { 
          meeting_id: params.meeting_id,
          error: error instanceof Error ? error.message : String(error) 
        });
        
        let errorResponse: { text: string, isError: boolean } = {
          text: `Error generating meeting join link: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        };
        
        // Customize error response based on error type
        if (error instanceof AuthenticationError) {
          errorResponse.text = error.message;
        } else if (error instanceof ValidationError) {
          errorResponse.text = error.message;
          
          // If we have validation errors, add them to the message
          if ('validationErrors' in error && Object.keys(error.validationErrors).length > 0) {
            errorResponse.text += '\n\nValidation errors:';
            for (const [field, message] of Object.entries(error.validationErrors)) {
              if (message) {
                errorResponse.text += `\n- ${field}: ${message}`;
              }
            }
          }
        } else if (error instanceof ResourceNotFoundError) {
          errorResponse.text = `Meeting with ID ${error.resourceId} not found`;
        } else if (error instanceof ApiResponseError) {
          // Handle specific status codes with user-friendly messages
          if (error.statusCode === 404) {
            errorResponse.text = `Meeting not found: ${error.apiErrorMessage}`;
          } else if (error.statusCode === 403) {
            errorResponse.text = `Authentication error: Insufficient permissions to generate meeting join link`;
          } else {
            errorResponse.text = `API error (${error.statusCode}): ${error.apiErrorMessage}`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorResponse.text,
            },
          ],
          isError: errorResponse.isError,
        };
      }
    }
  );

  logger.info('Meeting scheduling functionality set up successfully');
}
