import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'sb-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <h1>Reset Password</h1>
        <p>Enter your email and we'll send a reset link.</p>
        @if (sent) {
          <p class="success">Check your email for a reset link.</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email">
            </mat-form-field>
            <button mat-flat-button color="primary" class="full-width" [disabled]="form.invalid">Send Reset Link</button>
          </form>
        }
        <p class="auth-link"><a routerLink="/auth/login">Back to login</a></p>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1976d2, #0d47a1); padding: 16px; }
    .auth-card { max-width: 420px; padding: 32px; width: 100%; }
    .full-width { width: 100%; }
    .success { color: #10b981; }
    .auth-link { text-align: center; a { color: #1976d2; } }
  `],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  sent = false;

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  onSubmit(): void {
    this.auth.forgotPassword(this.form.value.email!).subscribe(() => { this.sent = true; });
  }
}
