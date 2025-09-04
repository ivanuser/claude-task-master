'use client';

import { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import swaggerSpec from '@/lib/openapi/swagger.json';

export default function ApiDocsPage() {
  useEffect(() => {
    // Add dark mode styles for Swagger UI
    const style = document.createElement('style');
    style.innerHTML = `
      .swagger-ui {
        font-family: var(--font-sans);
      }
      
      @media (prefers-color-scheme: dark) {
        .swagger-ui {
          filter: invert(0.88) hue-rotate(180deg);
        }
        
        .swagger-ui .highlight-code {
          filter: invert(1) hue-rotate(180deg);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
          <p className="text-muted-foreground">
            Complete REST API reference for Task Master Dashboard
          </p>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm">
          <SwaggerUI
            spec={swaggerSpec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            tryItOutEnabled={true}
          />
        </div>
      </div>
    </div>
  );
}