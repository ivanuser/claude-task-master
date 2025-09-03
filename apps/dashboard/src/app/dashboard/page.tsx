import { Card } from '@/components/ui/Card'
import { TaskList } from '@/components/common/TaskList'
import { ProjectCard } from '@/components/common/ProjectCard'
import { StatsOverview } from '@/components/charts/StatsOverview'

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>Dashboard</h2>
        <p className='mt-1 text-sm text-gray-500'>
          Overview of your projects and tasks across all repositories
        </p>
      </div>

      <StatsOverview />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <Card>
            <Card.Header>
              <Card.Title>Recent Tasks</Card.Title>
            </Card.Header>
            <Card.Content>
              <TaskList />
            </Card.Content>
          </Card>
        </div>

        <div className='space-y-6'>
          <Card>
            <Card.Header>
              <Card.Title>Active Projects</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className='space-y-4'>
                <ProjectCard />
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  )
}
