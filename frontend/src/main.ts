import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ThemeService } from './app/core/services';

bootstrapApplication(AppComponent, appConfig).then(() => {
  const theme = new ThemeService();
  theme.init();
});
