import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const STATUS_COLORS = {
  open: "#ea384c",
  in_progress: "#FFD700",
  closed: "#22c55e"
};

interface TicketChartProps {
  data: {
    openTickets: number;
    inProgressTickets: number;
    closedTickets: number;
  };
}

const TicketChart = ({ data }: TicketChartProps) => {
  const chartData = [
    { name: 'Open', value: data.openTickets, status: 'open' },
    { name: 'In Progress', value: data.inProgressTickets, status: 'in_progress' },
    { name: 'Closed', value: data.closedTickets, status: 'closed' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] p-4">
        <ChartContainer
          className="w-full h-full max-h-[300px]"
          config={{
            open: { theme: { light: STATUS_COLORS.open, dark: STATUS_COLORS.open } },
            in_progress: { theme: { light: STATUS_COLORS.in_progress, dark: STATUS_COLORS.in_progress } },
            closed: { theme: { light: STATUS_COLORS.closed, dark: STATUS_COLORS.closed } },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <ChartTooltip />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                fillOpacity={0.9}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default TicketChart;