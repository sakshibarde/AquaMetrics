import { Link } from 'react-router-dom';
import { ArrowRight, Droplet, BarChart3, MapPin, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Index = () => {
  const features = [
    {
      icon: Droplet,
      title: 'Check Water Quality',
      description: 'AI-powered analysis of water parameters for instant quality assessment',
      link: '/classify',
    },
    {
      icon: BarChart3,
      title: 'Live-Monitoring Data',
      description: 'Live updates from multiple monitoring stations keep you informed with the latest water conditions — directly from verified sources.',
      link: '/live-data',
    },
    {
      icon: TrendingUp,
      title: 'Future Predictions',
      description: 'Machine learning forecasts how water parameters might change in the coming days, helping take action before problems rise.',
      link: '/prediction',
    },
    {
      icon: MapPin,
      title: 'Interactive Map',
      description: 'A live, visual map showing all monitoring stations.',
      link: '/map',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Video Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source
              src="bg.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-2 mb-6 border border-white/20">
            <Droplet className="h-5 w-5 text-secondary" />
            <span className="text-sm font-medium">AI-Driven Water Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            AquaMetrics
          </h1>
          
          <p className="text-xl md:text-2xl mb-4 text-white/90 font-light">
            Because every drop deserves intelligent insight.
            {/* Where every drop tells a story — and we decode it. */}
          </p>
          
          <p className="text-base md:text-lg mb-10 text-white/80 max-w-3xl mx-auto leading-relaxed">
            AquaMetrics brings science and technology together to understand water like never before.
From tracking pH and oxygen levels to predicting future trends, we turn raw environmental data into meaningful insights — helping communities, researchers, and authorities protect every drop.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/classify">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-strong text-lg px-8 py-6">
                Analyze Water Quality Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/live-data">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-lg px-8 py-6"
              >
                View Live Data
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        {/* <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/70 rounded-full animate-water-flow" />
          </div>
        </div> */}
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background Animation */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <DotLottieReact
            src="https://lottie.host/671ea715-5cc9-45ee-8268-64885f8f6ba8/7dsJxzkW0f.lottie"
            loop
            autoplay
            style={{ width: '120%', height: '120%', opacity: 0.40 }}
          />
        </div>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-3 pb-3 bg-gradient-water bg-clip-text text-transparent">
              Real-Time Water Quality Intelligence System
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI-driven system blends machine learning with real-time monitoring to deliver accurate, actionable insights into water quality.
Track, compare, and predict changes across locations — all in one unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link key={index} to={feature.link}>
                  <Card className="p-6 h-full hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/20 group">
                    <div className="mb-4 p-3 bg-gradient-water rounded-lg w-fit group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
        
      </section>

    

      {/* Animation Section (replaces Stats) */}
      {/* <section className="">
        <div className="">
          <div className="w-full">
            <DotLottieReact
              src="https://lottie.host/671ea715-5cc9-45ee-8268-64885f8f6ba8/7dsJxzkW0f.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-7xl text-center text-muted-foreground">
          <p>© 2025 AquaMetrics. AI-driven Water Quality Intelligence Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
