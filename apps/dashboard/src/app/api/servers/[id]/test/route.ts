import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { NodeSSH } from 'node-ssh';

interface RouteParams {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get server details
    const server = await prisma.server.findUnique({
      where: { id: params.id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    try {
      // Connect to remote server via SSH
      const ssh = new NodeSSH();
      
      const connectionOptions: any = {
        host: server.host,
        port: server.port,
        username: server.username,
      };

      if (server.privateKey) {
        connectionOptions.privateKey = server.privateKey;
      } else if (server.password) {
        connectionOptions.password = server.password;
      } else {
        throw new Error('No authentication method configured');
      }

      // Test connection
      await ssh.connect(connectionOptions);

      // Test basic command
      const { stdout: hostname } = await ssh.execCommand('hostname');
      
      // Check if .taskmaster directory exists
      const tasksFilePath = `${server.projectPath}/.taskmaster/tasks/tasks.json`;
      const { stdout: fileExists } = await ssh.execCommand(`test -f ${tasksFilePath} && echo "exists" || echo "missing"`);
      
      const taskMasterFound = fileExists.trim() === 'exists';

      // Get basic system info
      const { stdout: uptime } = await ssh.execCommand('uptime');

      // Disconnect SSH
      ssh.dispose();

      // Update server status
      await prisma.server.update({
        where: { id: server.id },
        data: {
          lastPingAt: new Date(),
          isReachable: true,
          status: 'ACTIVE'
        }
      });

      return NextResponse.json({
        success: true,
        connection: {
          hostname: hostname.trim(),
          uptime: uptime.trim(),
          taskMasterFound,
          projectPath: server.projectPath,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      // Update server status as unreachable
      await prisma.server.update({
        where: { id: server.id },
        data: {
          isReachable: false,
          lastPingAt: new Date()
        }
      });

      throw error;
    }

  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      },
      { status: 500 }
    );
  }
}