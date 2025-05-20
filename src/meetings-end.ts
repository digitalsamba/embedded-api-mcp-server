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
