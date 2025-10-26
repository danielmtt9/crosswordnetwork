"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Users,
  TrendingUp,
  MapPin,
  Loader2,
  BarChart3,
  PieChart,
} from "lucide-react";

interface GeographicData {
  country: string;
  region?: string;
  city?: string;
  userCount: number;
  percentage: number;
  growth: number;
  lastUpdated: string;
}

interface GeographicDistributionProps {
  className?: string;
}

export function GeographicDistribution({ className }: GeographicDistributionProps) {
  const [data, setData] = useState<GeographicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'country' | 'region' | 'city'>('country');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchGeographicData();
  }, [viewMode, timeRange]);

  const fetchGeographicData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - in a real implementation, this would come from an API
      const mockData: GeographicData[] = [
        {
          country: 'United States',
          region: 'California',
          city: 'San Francisco',
          userCount: 1250,
          percentage: 25.5,
          growth: 12.3,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'United States',
          region: 'New York',
          city: 'New York City',
          userCount: 980,
          percentage: 20.0,
          growth: 8.7,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'Canada',
          region: 'Ontario',
          city: 'Toronto',
          userCount: 750,
          percentage: 15.3,
          growth: 15.2,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'United Kingdom',
          region: 'England',
          city: 'London',
          userCount: 620,
          percentage: 12.7,
          growth: 5.4,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'Germany',
          region: 'Bavaria',
          city: 'Munich',
          userCount: 480,
          percentage: 9.8,
          growth: 18.9,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'Australia',
          region: 'New South Wales',
          city: 'Sydney',
          userCount: 320,
          percentage: 6.5,
          growth: 22.1,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'Japan',
          region: 'Tokyo',
          city: 'Tokyo',
          userCount: 280,
          percentage: 5.7,
          growth: 9.8,
          lastUpdated: new Date().toISOString()
        },
        {
          country: 'France',
          region: 'Île-de-France',
          city: 'Paris',
          userCount: 220,
          percentage: 4.5,
          growth: 7.2,
          lastUpdated: new Date().toISOString()
        }
      ];

      // Filter data based on view mode
      let filteredData = mockData;
      if (viewMode === 'country') {
        // Group by country
        const countryMap = new Map<string, GeographicData>();
        mockData.forEach(item => {
          const existing = countryMap.get(item.country);
          if (existing) {
            existing.userCount += item.userCount;
            existing.percentage += item.percentage;
            existing.growth = (existing.growth + item.growth) / 2;
          } else {
            countryMap.set(item.country, { ...item, region: undefined, city: undefined });
          }
        });
        filteredData = Array.from(countryMap.values());
      } else if (viewMode === 'region') {
        // Group by region
        const regionMap = new Map<string, GeographicData>();
        mockData.forEach(item => {
          const key = `${item.country} - ${item.region}`;
          const existing = regionMap.get(key);
          if (existing) {
            existing.userCount += item.userCount;
            existing.percentage += item.percentage;
            existing.growth = (existing.growth + item.growth) / 2;
          } else {
            regionMap.set(key, { ...item, country: key, city: undefined });
          }
        });
        filteredData = Array.from(regionMap.values());
      }

      // Sort by user count
      filteredData.sort((a, b) => b.userCount - a.userCount);

      setData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load geographic data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalUsers = () => {
    return data.reduce((sum, item) => sum + item.userCount, 0);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 15) return 'text-green-600';
    if (growth > 5) return 'text-blue-600';
    if (growth > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3" />;
    return <TrendingUp className="h-3 w-3 rotate-180" />;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading geographic data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchGeographicData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Geographic Distribution
        </CardTitle>
        <CardDescription>
          User distribution across different locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">View:</span>
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="region">Region</SelectItem>
                <SelectItem value="city">City</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Period:</span>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{getTotalUsers().toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{data.length}</div>
            <div className="text-sm text-muted-foreground">Locations</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {data.length > 0 ? (data[0].percentage).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Top Location</div>
          </div>
        </div>

        {/* Geographic Data */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {viewMode === 'country' ? 'Countries' : viewMode === 'region' ? 'Regions' : 'Cities'}
          </h4>
          
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {viewMode === 'country' ? item.country : 
                       viewMode === 'region' ? item.region : item.city}
                    </span>
                    {viewMode !== 'country' && (
                      <span className="text-sm text-muted-foreground">
                        {item.country}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{item.userCount.toLocaleString()} users</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{item.percentage.toFixed(1)}%</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getGrowthColor(item.growth)}`}>
                      {getGrowthIcon(item.growth)}
                      <span>{item.growth > 0 ? '+' : ''}{item.growth.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    #{index + 1}
                  </Badge>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Insights */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Key Insights</h5>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Top 3 locations account for {data.slice(0, 3).reduce((sum, item) => sum + item.percentage, 0).toFixed(1)}% of users</li>
            <li>• {data.filter(item => item.growth > 10).length} locations showing strong growth (>10%)</li>
            <li>• Geographic diversity: {data.length} different {viewMode === 'country' ? 'countries' : viewMode === 'region' ? 'regions' : 'cities'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
