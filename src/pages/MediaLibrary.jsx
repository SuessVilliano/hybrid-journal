import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Search, Calendar, FileText, TrendingUp, Loader2 } from 'lucide-react';
import ImageViewer from '@/components/media/ImageViewer';

export default function MediaLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: dailyPlans = [], isLoading: loadingDaily } = useQuery({
    queryKey: ['dailyPlans'],
    queryFn: () => base44.entities.DailyTradePlan.list('-created_date', 500)
  });

  const { data: weeklyPlans = [], isLoading: loadingWeekly } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: () => base44.entities.WeeklyTradePlan.list('-created_date', 200)
  });

  const { data: monthlyPlans = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthlyPlans'],
    queryFn: () => base44.entities.MonthlyTradePlan.list('-created_date', 100)
  });

  const isLoading = loadingDaily || loadingWeekly || loadingMonthly;

  // Collect all images
  const allImages = React.useMemo(() => {
    const images = [];

    dailyPlans.forEach(plan => {
      if (plan.chart_screenshots && plan.chart_screenshots.length > 0) {
        plan.chart_screenshots.forEach(url => {
          images.push({
            url,
            type: 'daily',
            planId: plan.id,
            date: plan.date,
            planText: plan.plan_text,
            created: plan.created_date
          });
        });
      }
    });

    weeklyPlans.forEach(plan => {
      if (plan.chart_screenshots && plan.chart_screenshots.length > 0) {
        plan.chart_screenshots.forEach(url => {
          images.push({
            url,
            type: 'weekly',
            planId: plan.id,
            date: plan.week_start_date,
            planText: plan.plan_text,
            created: plan.created_date
          });
        });
      }
    });

    monthlyPlans.forEach(plan => {
      if (plan.chart_screenshots && plan.chart_screenshots.length > 0) {
        plan.chart_screenshots.forEach(url => {
          images.push({
            url,
            type: 'monthly',
            planId: plan.id,
            date: plan.month,
            planText: plan.plan_text,
            created: plan.created_date
          });
        });
      }
    });

    return images.sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [dailyPlans, weeklyPlans, monthlyPlans]);

  const filteredImages = React.useMemo(() => {
    let filtered = allImages;

    if (filterType !== 'all') {
      filtered = filtered.filter(img => img.type === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter(img =>
        img.planText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.date?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allImages, filterType, searchQuery]);

  const typeIcons = {
    daily: <Calendar className="h-4 w-4" />,
    weekly: <TrendingUp className="h-4 w-4" />,
    monthly: <FileText className="h-4 w-4" />
  };

  const typeColors = {
    daily: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    weekly: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    monthly: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Media Library
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            All your uploaded charts and screenshots
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by date or plan text..."
                  className={`pl-10 ${darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}`}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={`w-full md:w-48 ${
                  darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="daily">Daily Plans</SelectItem>
                  <SelectItem value="weekly">Weekly Plans</SelectItem>
                  <SelectItem value="monthly">Monthly Plans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`h-8 w-8 animate-spin ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className={`h-16 w-16 mx-auto mb-4 ${
                  darkMode ? 'text-slate-700' : 'text-slate-300'
                }`} />
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {searchQuery || filterType !== 'all' ? 'No images found' : 'No uploaded charts yet'}
                </p>
              </div>
            ) : (
              <div>
                <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredImages.map((image, idx) => (
                    <div
                      key={idx}
                      className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${
                        darkMode 
                          ? 'border-cyan-500/20 hover:border-cyan-500/50 bg-slate-900' 
                          : 'border-cyan-500/30 hover:border-cyan-500/60 bg-white'
                      }`}
                      onClick={() => setSelectedImage(image.url)}
                    >
                      <img
                        src={image.url}
                        alt="Chart"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <div className="text-white text-xs space-y-1">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${typeColors[image.type]}`}>
                            {typeIcons[image.type]}
                            <span className="capitalize">{image.type}</span>
                          </div>
                          <div className="font-medium">
                            {new Date(image.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedImage && (
        <ImageViewer
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}