import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'sb-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <div class="auth-header">
          <mat-icon class="logo">calendar_month</mat-icon>
          <h1>Create Business Account</h1>
          <p>Register as the owner of your business</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName">
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Organization Name</mat-label>
            <input matInput formControlName="organizationName">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password">
          </mat-form-field>
          @if (error) { <p class="error-msg">{{ error }}</p> }
          <button mat-flat-button color="primary" class="full-width submit-btn" [disabled]="loading || form.invalid">
            Create Account
          </button>
        </form>
        <p class="auth-link"><a routerLink="/auth/login">Already have an account? Sign in</a></p>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%);
      padding: 16px;
    }
    .auth-card { width: 100%; max-width: 480px; padding: 32px; border-radius: 16px !important; }
    .auth-header { text-align: center; margin-bottom: 24px;
      .logo { font-size: 48px; width: 48px; height: 48px; color: #1976d2; }
      h1 { margin: 8px 0 4px; }
      p { color: #6b7280; margin: 0; }
    }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; margin-top: 8px; }
    .error-msg { color: #ef4444; }
    .auth-link { text-align: center; margin-top: 16px; a { color: #1976d2; } }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    organizationName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.register(this.form.value as never).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        if (err.status === 0) {
          this.error = 'Cannot reach the server. Make sure the backend is running (npm run dev:backend).';
        } else {
          this.error = err.error?.message || 'Registration failed';
        }
        this.loading = false;
      },
    });
  }
}
